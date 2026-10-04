import { METRIC_VALUE_KIND } from "@/backend/lib/workspace-alert-status";
import type { MetricDayRow } from "@/backend/models/workspace-metric.model";
import type { WorkspaceMetricKey } from "@/generated/prisma/client";
import type { WorkspaceMetricSourceStatus } from "@/generated/prisma/client";
import {
  enumerateCalendarDaysInclusive,
  ymdFromPeriodIso,
} from "@/backend/lib/workspace-period";
import type { WorkspaceCalendarPeriod } from "@/backend/lib/workspace-period";

export type MetricSeriesPoint = {
  dateYmd: string;
  value: number | null;
};

export type MetricTargetHitStatus = "reached" | "not_reached" | null;

function ymdFromCalendarDay(date: Date): string {
  return ymdFromPeriodIso(date.toISOString());
}

function sourceStatusForMetric(
  key: WorkspaceMetricKey,
  statuses: {
    vtex: WorkspaceMetricSourceStatus;
    ga4: WorkspaceMetricSourceStatus;
    gsc: WorkspaceMetricSourceStatus;
  },
): WorkspaceMetricSourceStatus {
  switch (key) {
    case "vtex_revenue":
    case "vtex_orders":
      return statuses.vtex;
    case "ga4_sessions":
    case "ga4_conversion_pct":
      return statuses.ga4;
    case "gsc_clicks":
      return statuses.gsc;
    default:
      return "missing";
  }
}

export function computeMetricTargetHitStatus(input: {
  current: number | null;
  target: number | null;
}): MetricTargetHitStatus {
  const { current, target } = input;
  if (target === null || target <= 0 || current === null) {
    return null;
  }
  return current >= target ? "reached" : "not_reached";
}

export function buildMetricCumulativeSeries(input: {
  metricKey: WorkspaceMetricKey;
  period: WorkspaceCalendarPeriod;
  days: MetricDayRow[];
  sourceStatuses: {
    vtex: WorkspaceMetricSourceStatus;
    ga4: WorkspaceMetricSourceStatus;
    gsc: WorkspaceMetricSourceStatus;
  };
  terminalValue: number | null;
}): MetricSeriesPoint[] {
  const startYmd = ymdFromPeriodIso(input.period.start);
  const endYmd = ymdFromPeriodIso(input.period.collectEnd);
  const dayYmds = enumerateCalendarDaysInclusive(startYmd, endYmd);

  const byYmd = new Map<string, MetricDayRow>();
  for (const row of input.days) {
    byYmd.set(ymdFromCalendarDay(row.calendarDay), row);
  }

  const sourceOk =
    sourceStatusForMetric(input.metricKey, input.sourceStatuses) === "ok";

  let sumRevenue = 0;
  let sumOrders = 0;
  let sumSessions = 0;
  let sumPurchases = 0;
  let sumClicks = 0;
  let gscStopped = false;

  const points: MetricSeriesPoint[] = [];

  for (let i = 0; i < dayYmds.length; i += 1) {
    const ymd = dayYmds[i];
    const isLast = i === dayYmds.length - 1;
    const row = byYmd.get(ymd);

    if (input.metricKey === "gsc_clicks") {
      if (!gscStopped && row?.gscClicks != null) {
        sumClicks += row.gscClicks;
      } else if (row?.gscClicks == null && !gscStopped) {
        gscStopped = true;
      }
    } else if (sourceOk) {
      sumRevenue += row?.vtexRevenue ?? 0;
      sumOrders += row?.vtexOrders ?? 0;
      sumSessions += row?.ga4Sessions ?? 0;
      sumPurchases += row?.ga4Purchases ?? 0;
    }

    let value: number | null;
    if (isLast && input.terminalValue !== null) {
      value = input.terminalValue;
    } else if (!sourceOk) {
      value = null;
    } else if (
      input.metricKey === "gsc_clicks" &&
      gscStopped &&
      row?.gscClicks == null
    ) {
      value = null;
    } else {
      switch (input.metricKey) {
        case "vtex_revenue":
          value = sumRevenue;
          break;
        case "vtex_orders":
          value = sumOrders;
          break;
        case "ga4_sessions":
          value = sumSessions;
          break;
        case "gsc_clicks":
          value = sumClicks;
          break;
        case "ga4_conversion_pct":
          value =
            sumSessions > 0 ? (sumPurchases / sumSessions) * 100 : null;
          break;
        default:
          value = null;
      }
    }

    points.push({ dateYmd: ymd, value });
  }

  return points;
}
