import type { MeasurementCollectResult } from "@/backend/lib/measurement/schemas";
import type { AnalyticsNormalized } from "@/backend/lib/shared/normalized-adapters";
import type { VtexCollectResult } from "@/backend/lib/vtex/schemas";
import type { WorkspaceMetricKey } from "@/generated/prisma/client";
import type { WorkspaceMetricSourceStatus } from "@/generated/prisma/client";

export function isSnapshotCacheFresh(
  snapshot: {
    collectedAt: Date;
    vtexStatus: WorkspaceMetricSourceStatus;
    ga4Status: WorkspaceMetricSourceStatus;
    gscStatus: WorkspaceMetricSourceStatus;
  } | null,
  nowMs: number,
  ttlMs: number,
): boolean {
  if (!snapshot) {
    return false;
  }
  if (
    snapshot.vtexStatus === "failed" ||
    snapshot.ga4Status === "failed" ||
    snapshot.gscStatus === "failed"
  ) {
    return false;
  }
  return nowMs - snapshot.collectedAt.getTime() < ttlMs;
}

export type ExtractedMetricValues = {
  vtexRevenue: number | null;
  vtexOrders: number | null;
  ga4Sessions: number | null;
  ga4ConversionPct: number | null;
  gscClicks: number | null;
  vtexStatus: WorkspaceMetricSourceStatus;
  ga4Status: WorkspaceMetricSourceStatus;
  gscStatus: WorkspaceMetricSourceStatus;
  vtexError: string | null;
  ga4Error: string | null;
  gscError: string | null;
};

function measurementStatus(
  result: MeasurementCollectResult | null,
  source: "analytics" | "search-console",
  configured: boolean,
): { status: WorkspaceMetricSourceStatus; error: string | null } {
  if (!configured) {
    return { status: "missing", error: null };
  }
  if (!result) {
    return { status: "failed", error: "Coleta indisponível." };
  }
  const entry = result.sourceResults.find((r) => r.source === source);
  if (!entry || entry.status === "skipped") {
    return { status: "missing", error: null };
  }
  if (entry.status === "failed") {
    return { status: "failed", error: entry.error ?? "Falha na coleta." };
  }
  return { status: "ok", error: null };
}

function vtexStatusFromCollect(
  vtex: VtexCollectResult | null,
  configured: boolean,
  vtexError?: string,
): { status: WorkspaceMetricSourceStatus; error: string | null } {
  if (!configured) {
    return { status: "missing", error: null };
  }
  if (vtexError) {
    return { status: "failed", error: vtexError };
  }
  if (!vtex?.metrics) {
    return {
      status: "failed",
      error: "Falha na coleta VTEX.",
    };
  }
  return { status: "ok", error: null };
}

function analyticsFromMeasurement(
  result: MeasurementCollectResult | null,
): AnalyticsNormalized | null {
  if (!result?.analytics || typeof result.analytics !== "object") {
    return null;
  }
  return result.analytics as AnalyticsNormalized;
}

export function extractMetricValues(input: {
  vtex: VtexCollectResult | null;
  vtexError?: string;
  measurement: MeasurementCollectResult | null;
  vtexConfigured: boolean;
  ga4Configured: boolean;
  gscConfigured: boolean;
}): ExtractedMetricValues {
  const vtexState = vtexStatusFromCollect(
    input.vtex,
    input.vtexConfigured,
    input.vtexError,
  );
  const ga4State = measurementStatus(
    input.measurement,
    "analytics",
    input.ga4Configured,
  );
  const gscState = measurementStatus(
    input.measurement,
    "search-console",
    input.gscConfigured,
  );

  const metrics = input.vtex?.metrics;
  const analytics = input.measurement
    ? analyticsFromMeasurement(input.measurement)
    : null;
  const searchConsole = input.measurement?.searchConsole as
    | { overview?: { clicks?: number } }
    | null
    | undefined;

  return {
    vtexRevenue:
      vtexState.status === "ok" && metrics?.revenue !== undefined
        ? metrics.revenue
        : null,
    vtexOrders:
      vtexState.status === "ok" && metrics?.order_count !== undefined
        ? metrics.order_count
        : null,
    ga4Sessions:
      ga4State.status === "ok" && analytics?.totals?.sessions !== undefined
        ? analytics.totals.sessions
        : null,
    ga4ConversionPct:
      ga4State.status === "ok" &&
      analytics?.funnel_rates?.session_to_purchase_pct !== undefined
        ? analytics.funnel_rates.session_to_purchase_pct
        : null,
    gscClicks:
      gscState.status === "ok" && searchConsole?.overview?.clicks !== undefined
        ? searchConsole.overview.clicks
        : null,
    vtexStatus: vtexState.status,
    ga4Status: ga4State.status,
    gscStatus: gscState.status,
    vtexError: vtexState.error,
    ga4Error: ga4State.error,
    gscError: gscState.error,
  };
}

export function metricValueFromSnapshot(
  key: WorkspaceMetricKey,
  snapshot: {
    vtexRevenue: number | null;
    vtexOrders: number | null;
    ga4Sessions: number | null;
    ga4ConversionPct: number | null;
    gscClicks: number | null;
  },
): number | null {
  switch (key) {
    case "vtex_revenue":
      return snapshot.vtexRevenue;
    case "vtex_orders":
      return snapshot.vtexOrders;
    case "ga4_sessions":
      return snapshot.ga4Sessions;
    case "ga4_conversion_pct":
      return snapshot.ga4ConversionPct;
    case "gsc_clicks":
      return snapshot.gscClicks;
    default:
      return null;
  }
}

export const METRIC_DEFINITIONS: Array<{
  key: WorkspaceMetricKey;
  label: string;
  source: "vtex" | "ga4" | "gsc";
  unit: "currency" | "count" | "percent";
}> = [
  {
    key: "vtex_revenue",
    label: "Receita",
    source: "vtex",
    unit: "currency",
  },
  {
    key: "vtex_orders",
    label: "Pedidos",
    source: "vtex",
    unit: "count",
  },
  {
    key: "ga4_sessions",
    label: "Sessões",
    source: "ga4",
    unit: "count",
  },
  {
    key: "ga4_conversion_pct",
    label: "Conversão",
    source: "ga4",
    unit: "percent",
  },
  {
    key: "gsc_clicks",
    label: "Cliques",
    source: "gsc",
    unit: "count",
  },
];
