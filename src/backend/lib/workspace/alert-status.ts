import type { WorkspaceMetricKey } from "@/generated/prisma/client";

export type AlertPaceStatus = "on_track" | "at_risk" | "off_track";

export type MetricValueKind = "accumulator" | "rate";

export type MetricZoneStatus = "below_min" | "in_band" | "on_meta_pace";

export type MetricProjectionRisk = "wont_hit_min" | "wont_hit_meta" | "on_course";

export const METRIC_VALUE_KIND: Record<WorkspaceMetricKey, MetricValueKind> = {
  vtex_revenue: "accumulator",
  vtex_orders: "accumulator",
  ga4_sessions: "accumulator",
  ga4_conversion_pct: "rate",
  gsc_clicks: "accumulator",
  clarity_sessions: "accumulator",
  clarity_dead_clicks: "accumulator",
  clarity_quick_backs: "accumulator",
};

function paceFraction(elapsedDays: number, totalDays: number): number {
  const safeTotal = Math.max(1, totalDays);
  const safeElapsed = Math.max(1, Math.min(elapsedDays, safeTotal));
  return safeElapsed / safeTotal;
}

export function computePacedThreshold(input: {
  metricKey: WorkspaceMetricKey;
  threshold: number;
  elapsedDays: number;
  totalDays: number;
}): number {
  const { metricKey, threshold, elapsedDays, totalDays } = input;
  if (METRIC_VALUE_KIND[metricKey] === "rate") {
    return threshold;
  }
  return threshold * paceFraction(elapsedDays, totalDays);
}

export function computeMetricZoneStatus(input: {
  metricKey: WorkspaceMetricKey;
  current: number | null;
  minExpected: number | null;
  target: number | null;
  elapsedDays: number;
  totalDays: number;
}): MetricZoneStatus | null {
  const { metricKey, current, minExpected, target, elapsedDays, totalDays } =
    input;
  if (
    minExpected === null ||
    target === null ||
    minExpected <= 0 ||
    target <= 0 ||
    current === null
  ) {
    return null;
  }

  const pacedMin = computePacedThreshold({
    metricKey,
    threshold: minExpected,
    elapsedDays,
    totalDays,
  });
  const pacedTarget = computePacedThreshold({
    metricKey,
    threshold: target,
    elapsedDays,
    totalDays,
  });

  if (current >= pacedTarget) {
    return "on_meta_pace";
  }
  if (current >= pacedMin) {
    return "in_band";
  }
  return "below_min";
}

export function computeMetricProjectionRisk(input: {
  metricKey: WorkspaceMetricKey;
  projection: number | null;
  minExpected: number | null;
  target: number | null;
}): MetricProjectionRisk | null {
  const { projection, minExpected, target } = input;
  if (
    projection === null ||
    minExpected === null ||
    target === null ||
    minExpected <= 0 ||
    target <= 0
  ) {
    return null;
  }

  if (projection < minExpected) {
    return "wont_hit_min";
  }
  if (projection < target) {
    return "wont_hit_meta";
  }
  return "on_course";
}

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

  const fraction = paceFraction(elapsedDays, totalDays);
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
  const fraction = paceFraction(elapsedDays, totalDays);
  return current / fraction;
}
