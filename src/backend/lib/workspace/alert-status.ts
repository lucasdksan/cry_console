import type { WorkspaceMetricKey } from "@/generated/prisma/client";

export type AlertPaceStatus = "on_track" | "at_risk" | "off_track";

export type MetricValueKind = "accumulator" | "rate";

export const METRIC_VALUE_KIND: Record<WorkspaceMetricKey, MetricValueKind> = {
  vtex_revenue: "accumulator",
  vtex_orders: "accumulator",
  ga4_sessions: "accumulator",
  ga4_conversion_pct: "rate",
  gsc_clicks: "accumulator",
};

export function computePaceStatus(input: {
  metricKey: WorkspaceMetricKey;
  current: number | null;
  target: number | null;
  elapsedDays: number;
  totalDays: number;
}): AlertPaceStatus | null {
  const { metricKey, current, target, elapsedDays, totalDays } = input;
  if (target === null || target <= 0 || current === null) {
    return null;
  }

  const kind = METRIC_VALUE_KIND[metricKey];
  if (kind === "rate") {
    return current >= target ? "on_track" : "off_track";
  }

  const safeTotal = Math.max(1, totalDays);
  const safeElapsed = Math.max(1, Math.min(elapsedDays, safeTotal));
  const fraction = safeElapsed / safeTotal;
  const pace = target * fraction;
  const projection = current / fraction;

  if (current >= pace) {
    return "on_track";
  }
  if (projection >= target) {
    return "at_risk";
  }
  return "off_track";
}

export function computeProgressPct(
  current: number | null,
  target: number | null,
): number | null {
  if (current === null || target === null || target <= 0) {
    return null;
  }
  return (current / target) * 100;
}

export function computeProjection(
  metricKey: WorkspaceMetricKey,
  current: number | null,
  elapsedDays: number,
  totalDays: number,
): number | null {
  if (current === null) {
    return null;
  }
  if (METRIC_VALUE_KIND[metricKey] === "rate") {
    return current;
  }
  const safeTotal = Math.max(1, totalDays);
  const safeElapsed = Math.max(1, Math.min(elapsedDays, safeTotal));
  const fraction = safeElapsed / safeTotal;
  return current / fraction;
}
