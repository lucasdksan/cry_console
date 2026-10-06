import type { WorkspaceMetricKey } from "@/generated/prisma/client";

import type { AgentWorkspaceCommand } from "@/backend/lib/agent/command";
import {
  isWorkspaceMetricKey,
  resolveMetricFromHint,
} from "@/backend/lib/agent/chart";
import type { AgentProjectionPart } from "@/backend/lib/agent/types";
import { CHART_METRIC_LABELS } from "@/backend/lib/agent/types";
import { buildMetricDailySeries } from "@/backend/lib/workspace/metric-series";
import type { MetricDayRow } from "@/backend/models/workspace-metric.model";
import { forecastDailyValues } from "@/backend/lib/workspace/daily-forecast";
import {
  enumerateCalendarDaysInclusive,
  ymdFromPeriodIso,
} from "@/backend/lib/workspace/period";
import type { WorkspaceCalendarPeriod } from "@/backend/lib/workspace/period";

export function sampleStdDev(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function sampleMean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function resolveProjectionMetricForCommand(input: {
  command?: AgentWorkspaceCommand;
  markerMetric: WorkspaceMetricKey | null;
}): WorkspaceMetricKey | null {
  if (input.markerMetric) {
    return input.markerMetric;
  }
  if (input.command?.kind === "projection") {
    return resolveMetricFromHint(input.command.metricHint);
  }
  return null;
}

export function shouldAttachProjectionFromCommand(
  command: AgentWorkspaceCommand | undefined,
  markerMetric: WorkspaceMetricKey | null,
): boolean {
  if (markerMetric) {
    return true;
  }
  return command?.kind === "projection";
}

export function buildProjectionPart(input: {
  metricKey: WorkspaceMetricKey;
  period: WorkspaceCalendarPeriod;
  metricDays: MetricDayRow[];
  sourceStatuses: {
    vtex: "ok" | "failed" | "missing";
    ga4: "ok" | "failed" | "missing";
    gsc: "ok" | "failed" | "missing";
  };
}): AgentProjectionPart | null {
  const daily = buildMetricDailySeries({
    metricKey: input.metricKey,
    period: input.period,
    days: input.metricDays,
    sourceStatuses: input.sourceStatuses,
  });

  const collectEndYmd = ymdFromPeriodIso(input.period.collectEnd);
  const monthEndYmd = ymdFromPeriodIso(input.period.end);
  const observedValues = daily
    .filter((p) => p.dateYmd <= collectEndYmd && p.value !== null)
    .map((p) => p.value as number);

  if (observedValues.length === 0) {
    return null;
  }

  const mean = sampleMean(observedValues);
  const stdDev = sampleStdDev(observedValues);
  const isRateMetric = input.metricKey === "ga4_conversion_pct";

  const outlierDays: AgentProjectionPart["outlierDays"] = [];
  if (mean !== null && stdDev !== null && stdDev > 0) {
    for (const point of daily) {
      if (
        point.dateYmd <= collectEndYmd &&
        point.value !== null &&
        Math.abs(point.value - mean) > stdDev
      ) {
        outlierDays.push({ dateYmd: point.dateYmd, value: point.value });
      }
    }
  }

  const observedTotal = isRateMetric
    ? null
    : observedValues.reduce((a, b) => a + b, 0);

  const periodStartYmd = ymdFromPeriodIso(input.period.start);
  const allYmds = enumerateCalendarDaysInclusive(
    periodStartYmd,
    monthEndYmd,
  );
  const ymdToIndex = new Map(allYmds.map((ymd, index) => [ymd, index]));

  const observedForForecast = daily
    .filter(
      (p) =>
        p.dateYmd <= collectEndYmd &&
        p.value !== null &&
        ymdToIndex.has(p.dateYmd),
    )
    .map((p) => ({
      index: ymdToIndex.get(p.dateYmd)!,
      value: p.value as number,
    }));

  const futureYmds = allYmds.filter((ymd) => ymd > collectEndYmd);
  const forecast = forecastDailyValues({
    observed: observedForForecast,
    futureIndices: futureYmds.map((ymd) => ymdToIndex.get(ymd)!),
    isRateMetric,
  });
  const projectedByYmd = new Map(
    futureYmds.map((ymd, i) => [ymd, forecast.values[i]!]),
  );

  let projectedMonthTotal: number | null = null;
  if (isRateMetric && mean !== null) {
    projectedMonthTotal = mean;
  } else if (observedTotal !== null) {
    const futureSum = forecast.values.reduce((a, b) => a + b, 0);
    projectedMonthTotal = observedTotal + futureSum;
  }

  const points = daily.map((point) => {
    const isFuture = point.dateYmd > collectEndYmd;
    const bandUpper =
      mean !== null && stdDev !== null ? mean + stdDev : null;
    const bandLower =
      mean !== null && stdDev !== null ? mean - stdDev : null;
    const projectedValue = isFuture
      ? (projectedByYmd.get(point.dateYmd) ?? null)
      : null;
    return {
      dateYmd: point.dateYmd,
      dailyValue: isFuture ? null : point.value,
      projectedValue,
      meanLine: mean,
      bandUpper,
      bandLower,
      isFuture,
    };
  });

  return {
    type: "projection",
    metricKey: input.metricKey,
    label: CHART_METRIC_LABELS[input.metricKey],
    mean,
    stdDev,
    observedTotal,
    projectedMonthTotal,
    isRateMetric,
    forecastMethod: forecast.method,
    outlierDays,
    points,
  };
}

export function buildProjectionPartForWorkspaceCommand(input: {
  workspaceCommand?: AgentWorkspaceCommand;
  markerMetric?: WorkspaceMetricKey | null;
  period: WorkspaceCalendarPeriod;
  metricDays: MetricDayRow[];
  sourceStatuses: {
    vtex: "ok" | "failed" | "missing";
    ga4: "ok" | "failed" | "missing";
    gsc: "ok" | "failed" | "missing";
  };
}): AgentProjectionPart | null {
  const metricKey = resolveProjectionMetricForCommand({
    command: input.workspaceCommand,
    markerMetric: input.markerMetric ?? null,
  });
  if (
    !metricKey ||
    !shouldAttachProjectionFromCommand(
      input.workspaceCommand,
      input.markerMetric ?? null,
    )
  ) {
    return null;
  }
  return buildProjectionPart({
    metricKey,
    period: input.period,
    metricDays: input.metricDays,
    sourceStatuses: input.sourceStatuses,
  });
}

export function isProjectionMetricKey(value: string): value is WorkspaceMetricKey {
  return isWorkspaceMetricKey(value);
}
