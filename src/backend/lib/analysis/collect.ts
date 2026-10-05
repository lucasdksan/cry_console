import { buildAnalysisMeasurement } from "@/backend/lib/analysis/heuristics";
import type { AnalysisMeasurementJson } from "@/backend/lib/analysis/types";
import {
  analyticsFromMeasurement,
  clarityFromMeasurement,
  searchConsoleFromMeasurement,
} from "@/backend/lib/analysis/normalized";
import { lastNDaysPeriod } from "@/backend/lib/overview/period";
import {
  isClarityConfigured,
  isGa4Configured,
  isGscConfigured,
  isVtexConfigured,
} from "@/backend/lib/overview/status";
import {
  defaultMeasurementSources,
  runMeasurementCollect,
  type MeasurementSource,
} from "@/backend/lib/measurement";
import { runVtexCollect } from "@/backend/lib/vtex/run-collectors";
import type { VtexCollectResult } from "@/backend/lib/vtex/schemas";
import type { MeasurementCollectResult } from "@/backend/lib/measurement/schemas";
import {
  calendarDayFromYmd,
  ymdFromPeriodIso,
} from "@/backend/lib/workspace/period";
import { listMetricDaysForRange } from "@/backend/models/workspace-metric.model";
import {
  getWorkspaceMeasurementSecretsForUser,
  getWorkspaceVtexConfigForUser,
  type WorkspaceOverviewListItem,
} from "@/backend/models/workspace.model";

export const ANALYSIS_PERIOD_DAYS = 30;
export const ANALYSIS_COLLECT_CACHE_MS = 15 * 60 * 1000;

export type AnalysisCollectResult = {
  measurement: AnalysisMeasurementJson;
  period: ReturnType<typeof lastNDaysPeriod>;
  collectedAt: Date;
};

function vtexMetricsFromCollect(
  vtex: Awaited<ReturnType<typeof runVtexCollect>> | null,
) {
  if (!vtex?.metrics) {
    return null;
  }
  return {
    order_count: vtex.metrics.order_count,
    revenue: vtex.metrics.revenue,
    canceled: vtex.metrics.canceled,
  };
}

export async function collectAnalysisInputs(input: {
  userId: string;
  workspaceId: string;
  workspace: WorkspaceOverviewListItem;
}): Promise<AnalysisCollectResult> {
  const period = lastNDaysPeriod(ANALYSIS_PERIOD_DAYS);

  const measurementSources: MeasurementSource[] = [];
  if (isGa4Configured(input.workspace)) {
    measurementSources.push("analytics");
  }
  if (isGscConfigured(input.workspace)) {
    measurementSources.push("search-console");
  }
  if (isClarityConfigured(input.workspace)) {
    measurementSources.push("clarity");
  }

  const vtexPromise = (async (): Promise<{
    result: VtexCollectResult | null;
    error?: string;
  }> => {
    if (!isVtexConfigured(input.workspace)) {
      return { result: null };
    }
    try {
      const config = await getWorkspaceVtexConfigForUser(
        input.userId,
        input.workspaceId,
      );
      const result = await runVtexCollect({
        config: {
          account: config.account,
          environment: config.environment,
          appKey: config.appKey,
          appToken: config.appToken,
        },
        siteUrl: config.siteUrl,
        period: { start: period.start, end: period.end },
        collectors: ["orders"],
      });
      return { result };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "Falha VTEX.",
      };
    }
  })();

  const measurementPromise = (async (): Promise<MeasurementCollectResult | null> => {
    if (measurementSources.length === 0) {
      return null;
    }
    try {
      const secrets = await getWorkspaceMeasurementSecretsForUser(
        input.userId,
        input.workspaceId,
      );
      return await runMeasurementCollect({
        secrets,
        workspaceId: input.workspaceId,
        period: { start: period.start, end: period.end },
        sources: measurementSources.length
          ? measurementSources
          : defaultMeasurementSources(),
        gaPropertyId: input.workspace.gaPropertyId ?? undefined,
      });
    } catch {
      return null;
    }
  })();

  const [vtexOutcome, measurementResult] = await Promise.all([
    vtexPromise,
    measurementPromise,
  ]);
  const vtexResult = vtexOutcome.result;
  const vtexError = vtexOutcome.error;

  const collectedAt = new Date();

  const vtexOk =
    isVtexConfigured(input.workspace) &&
    !vtexError &&
    vtexResult !== null &&
    vtexResult.collectorResults.some(
      (r) => r.collector === "orders" && r.status === "ok",
    );

  const gaOk =
    measurementResult?.sourceResults.some(
      (r) => r.source === "analytics" && r.status === "ok",
    ) ?? false;
  const gscOk =
    measurementResult?.sourceResults.some(
      (r) => r.source === "search-console" && r.status === "ok",
    ) ?? false;
  const clarityOk =
    measurementResult?.sourceResults.some(
      (r) => r.source === "clarity" && r.status === "ok",
    ) ?? false;

  const periodStartDay = calendarDayFromYmd(ymdFromPeriodIso(period.start));
  const periodEndDay = calendarDayFromYmd(ymdFromPeriodIso(period.end));
  const metricDays = await listMetricDaysForRange(
    input.workspaceId,
    periodStartDay,
    periodEndDay,
  );

  const measurement = buildAnalysisMeasurement({
    period,
    collectedAt: collectedAt.toISOString(),
    vtexConfigured: isVtexConfigured(input.workspace),
    gaConfigured: isGa4Configured(input.workspace),
    gscConfigured: isGscConfigured(input.workspace),
    clarityConfigured: isClarityConfigured(input.workspace),
    vtexOk,
    gaOk,
    gscOk,
    clarityOk,
    vtexMetrics: vtexMetricsFromCollect(vtexResult),
    analytics: analyticsFromMeasurement(measurementResult),
    searchConsole: searchConsoleFromMeasurement(measurementResult),
    clarity: clarityFromMeasurement(measurementResult),
    metricDays,
  });

  return { measurement, period, collectedAt };
}

export function isAnalysisCollectFresh(
  collectedAt: Date | null,
  nowMs: number = Date.now(),
): boolean {
  if (!collectedAt) {
    return false;
  }
  return nowMs - collectedAt.getTime() < ANALYSIS_COLLECT_CACHE_MS;
}
