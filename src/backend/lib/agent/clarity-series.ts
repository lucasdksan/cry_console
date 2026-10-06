import type { WorkspaceMetricKey } from "@/generated/prisma/client";

import type { ClaritySnapshotRow } from "@/backend/models/workspace-clarity-snapshot.model";
import {
  enumerateCalendarDaysInclusive,
  ymdFromPeriodIso,
} from "@/backend/lib/workspace/period";
import type { WorkspaceCalendarPeriod } from "@/backend/lib/workspace/period";
import type { MetricSeriesPoint } from "@/backend/lib/workspace/metric-series";

const CLARITY_METRIC_KEYS = new Set<WorkspaceMetricKey>([
  "clarity_sessions",
  "clarity_dead_clicks",
  "clarity_quick_backs",
]);

export function isClarityWorkspaceMetricKey(
  key: WorkspaceMetricKey,
): boolean {
  return CLARITY_METRIC_KEYS.has(key);
}

function ymdFromCapturedOn(date: Date): string {
  return ymdFromPeriodIso(date.toISOString());
}

function clarityValueFromPayload(
  metricKey: WorkspaceMetricKey,
  payload: ClaritySnapshotRow["payload"],
): number | null {
  if (!payload) {
    return null;
  }
  switch (metricKey) {
    case "clarity_sessions":
      return payload.sessions ?? null;
    case "clarity_dead_clicks":
      return payload.deadClicks ?? null;
    case "clarity_quick_backs":
      return payload.quickBacks ?? null;
    default:
      return null;
  }
}

export function buildClarityMetricSeries(input: {
  metricKey: WorkspaceMetricKey;
  period: WorkspaceCalendarPeriod;
  snapshots: ClaritySnapshotRow[];
  terminalValue?: number | null;
}): MetricSeriesPoint[] {
  if (!isClarityWorkspaceMetricKey(input.metricKey)) {
    return [];
  }

  const startYmd = ymdFromPeriodIso(input.period.start);
  const endYmd = ymdFromPeriodIso(input.period.collectEnd);
  const dayYmds = enumerateCalendarDaysInclusive(startYmd, endYmd);

  const byYmd = new Map<string, ClaritySnapshotRow>();
  for (const row of input.snapshots) {
    byYmd.set(ymdFromCapturedOn(row.capturedOn), row);
  }

  return dayYmds.map((dateYmd, index) => {
    const isLast = index === dayYmds.length - 1;
    if (isLast && input.terminalValue !== undefined && input.terminalValue !== null) {
      return { dateYmd, value: input.terminalValue };
    }
    const snapshot = byYmd.get(dateYmd);
    if (!snapshot) {
      return { dateYmd, value: null };
    }
    return {
      dateYmd,
      value: clarityValueFromPayload(input.metricKey, snapshot.payload),
    };
  });
}

export function clarityMetricValueFromSnapshot(
  metricKey: WorkspaceMetricKey,
  snapshot: ClaritySnapshotRow | null,
): number | null {
  if (!snapshot) {
    return null;
  }
  return clarityValueFromPayload(metricKey, snapshot.payload);
}
