import { collectGa4DailyMetrics } from "@/backend/lib/google/ga4-daily-collector";
import { collectGscDailyClicks } from "@/backend/lib/google/gsc-daily-collector";
import {
  GA4_READONLY_SCOPE,
  GSC_READONLY_SCOPE,
  getGoogleAccessToken,
  type FetchFn,
} from "@/backend/lib/google/google-auth";
import { normalizeGscSiteUrl } from "@/backend/lib/google/gsc-site-url";
import { aggregateVtexOrdersByDay } from "@/backend/lib/workspace-metric-vtex-daily";
import type { WorkspaceCalendarPeriod } from "@/backend/lib/workspace-period";
import {
  calendarDayFromYmd,
  enumerateCalendarDaysInclusive,
  ymdFromPeriodIso,
} from "@/backend/lib/workspace-period";
import type { MetricDayRow, MetricDayUpsertInput } from "@/backend/models/workspace-metric.model";
import type { GaServiceAccount } from "@/backend/lib/workspace-policy";
import type { VtexOrder } from "@/backend/lib/vtex/schemas";
import type { WorkspaceMetricSourceStatus } from "@/generated/prisma/client";

export function buildMetricDayUpserts(input: {
  workspaceId: string;
  period: WorkspaceCalendarPeriod;
  collectedAt: Date;
  existing: MetricDayRow[];
  vtexByDay: Map<string, { revenue: number; orders: number }> | null;
  ga4ByDay: Map<string, { sessions: number; purchases: number }> | null;
  gscByDay: Map<string, number> | null;
}): MetricDayUpsertInput[] {
  const startYmd = ymdFromPeriodIso(input.period.start);
  const endYmd = ymdFromPeriodIso(input.period.collectEnd);
  const dayYmds = enumerateCalendarDaysInclusive(startYmd, endYmd);
  const existingByYmd = new Map<string, MetricDayRow>();
  for (const row of input.existing) {
    const ymd = ymdFromPeriodIso(row.calendarDay.toISOString());
    existingByYmd.set(ymd, row);
  }

  return dayYmds.map((ymd) => {
    const prior = existingByYmd.get(ymd);
    let vtexRevenue = prior?.vtexRevenue ?? null;
    let vtexOrders = prior?.vtexOrders ?? null;
    let ga4Sessions = prior?.ga4Sessions ?? null;
    let ga4Purchases = prior?.ga4Purchases ?? null;
    let gscClicks = prior?.gscClicks ?? null;

    if (input.vtexByDay) {
      const vtex = input.vtexByDay.get(ymd);
      vtexRevenue = vtex?.revenue ?? 0;
      vtexOrders = vtex?.orders ?? 0;
    }

    if (input.ga4ByDay) {
      const ga4 = input.ga4ByDay.get(ymd);
      ga4Sessions = ga4?.sessions ?? 0;
      ga4Purchases = ga4?.purchases ?? 0;
    }

    if (input.gscByDay && input.gscByDay.has(ymd)) {
      gscClicks = input.gscByDay.get(ymd) ?? null;
    }

    return {
      workspaceId: input.workspaceId,
      calendarDay: calendarDayFromYmd(ymd),
      collectedAt: input.collectedAt,
      vtexRevenue,
      vtexOrders,
      ga4Sessions,
      ga4Purchases,
      gscClicks,
    };
  });
}

export async function syncWorkspaceMetricDays(input: {
  workspaceId: string;
  period: WorkspaceCalendarPeriod;
  collectedAt: Date;
  siteUrl: string;
  gaServiceAccount?: GaServiceAccount;
  gaPropertyId?: string;
  vtexOrders: VtexOrder[] | null;
  vtexStatus: WorkspaceMetricSourceStatus;
  ga4Status: WorkspaceMetricSourceStatus;
  gscStatus: WorkspaceMetricSourceStatus;
  existingDays: MetricDayRow[];
  fetchFn?: FetchFn;
}): Promise<void> {
  const fetchFn = input.fetchFn ?? fetch;
  const periodRange = {
    start: input.period.start,
    end: input.period.collectEnd,
  };

  const vtexByDay =
    input.vtexStatus === "ok" && input.vtexOrders
      ? aggregateVtexOrdersByDay(input.vtexOrders)
      : input.vtexStatus === "ok"
        ? new Map<string, { revenue: number; orders: number }>()
        : null;

  let ga4ByDay: Map<string, { sessions: number; purchases: number }> | null =
    null;
  let gscByDay: Map<string, number> | null = null;

  const needsGoogle =
    (input.ga4Status !== "missing" && input.ga4Status !== "failed") ||
    (input.gscStatus !== "missing" && input.gscStatus !== "failed");

  let googleToken: string | undefined;
  if (
    needsGoogle &&
    input.gaServiceAccount &&
    (input.ga4Status === "ok" || input.gscStatus === "ok")
  ) {
    const scopes = [
      ...(input.ga4Status === "ok" ? [GA4_READONLY_SCOPE] : []),
      ...(input.gscStatus === "ok" ? [GSC_READONLY_SCOPE] : []),
    ];
    googleToken = await getGoogleAccessToken(
      input.gaServiceAccount,
      scopes,
      fetchFn,
    );
  }

  if (input.ga4Status === "ok" && googleToken && input.gaPropertyId?.trim()) {
    try {
      const rows = await collectGa4DailyMetrics({
        accessToken: googleToken,
        propertyId: input.gaPropertyId.trim(),
        period: periodRange,
        fetchFn,
      });
      ga4ByDay = new Map(
        rows.map((row) => [
          row.dateYmd,
          { sessions: row.sessions, purchases: row.purchases },
        ]),
      );
    } catch {
      ga4ByDay = null;
    }
  }

  if (input.gscStatus === "ok" && googleToken) {
    try {
      const rows = await collectGscDailyClicks({
        accessToken: googleToken,
        siteUrl: normalizeGscSiteUrl(input.siteUrl),
        period: periodRange,
        fetchFn,
      });
      gscByDay = new Map(rows.map((row) => [row.dateYmd, row.clicks]));
    } catch {
      gscByDay = null;
    }
  }

  const upserts = buildMetricDayUpserts({
    workspaceId: input.workspaceId,
    period: input.period,
    collectedAt: input.collectedAt,
    existing: input.existingDays,
    vtexByDay,
    ga4ByDay,
    gscByDay,
  });

  const { upsertMetricDays } = await import(
    "@/backend/models/workspace-metric.model"
  );
  await upsertMetricDays(upserts);
}
