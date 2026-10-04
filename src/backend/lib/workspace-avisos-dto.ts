import {
  METRIC_DEFINITIONS,
  metricValueFromSnapshot,
} from "@/backend/lib/workspace-alert-metrics";
import {
  computePaceStatus,
  computeProgressPct,
  computeProjection,
  type AlertPaceStatus,
} from "@/backend/lib/workspace-alert-status";
import type { WorkspaceCalendarPeriod } from "@/backend/lib/workspace-period";
import {
  buildMetricCumulativeSeries,
  computeMetricTargetHitStatus,
  type MetricSeriesPoint,
  type MetricTargetHitStatus,
} from "@/backend/lib/workspace-metric-series";
import type {
  MetricDayRow,
  MetricSnapshotRow,
  MetricTargetRow,
} from "@/backend/models/workspace-metric.model";
import type { WorkspaceMetricKey } from "@/generated/prisma/client";
import type { WorkspaceMetricSourceStatus } from "@/generated/prisma/client";

export type AvisosSourceKey = "vtex" | "ga4" | "gsc";

export type AvisosMetricCard = {
  key: WorkspaceMetricKey;
  label: string;
  source: AvisosSourceKey;
  unit: "currency" | "count" | "percent";
  target: number | null;
  current: number | null;
  progressPct: number | null;
  projection: number | null;
  status: AlertPaceStatus | null;
  hasTarget: boolean;
  targetHitStatus: MetricTargetHitStatus;
  series: MetricSeriesPoint[];
};

export type AvisosSourceBlock = {
  source: AvisosSourceKey;
  label: string;
  status: WorkspaceMetricSourceStatus;
  error: string | null;
  metrics: AvisosMetricCard[];
};

export type WorkspaceAvisosDTO = {
  workspaceId: string;
  workspaceName: string;
  periodType: "week" | "month";
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  collectedAt: string | null;
  snapshotStale: boolean;
  sources: AvisosSourceBlock[];
};

const SOURCE_LABELS: Record<AvisosSourceKey, string> = {
  vtex: "VTEX",
  ga4: "GA4",
  gsc: "Google Search",
};

function sourceStatusFromSnapshot(
  snapshot: MetricSnapshotRow,
  source: AvisosSourceKey,
): { status: WorkspaceMetricSourceStatus; error: string | null } {
  switch (source) {
    case "vtex":
      return {
        status: snapshot.vtexStatus,
        error: snapshot.vtexError ?? null,
      };
    case "ga4":
      return {
        status: snapshot.ga4Status,
        error: snapshot.ga4Error ?? null,
      };
    case "gsc":
      return {
        status: snapshot.gscStatus,
        error: snapshot.gscError ?? null,
      };
  }
}

function targetFor(
  targets: MetricTargetRow[],
  key: WorkspaceMetricKey,
  periodType: "week" | "month",
): number | null {
  const row = targets.find(
    (t) => t.metricKey === key && t.periodType === periodType,
  );
  return row?.targetValue ?? null;
}

export function buildWorkspaceAvisosDto(input: {
  workspaceId: string;
  workspaceName: string;
  periodType: "week" | "month";
  period: WorkspaceCalendarPeriod;
  targets: MetricTargetRow[];
  snapshot: MetricSnapshotRow | null;
  snapshotStale: boolean;
  metricDays: MetricDayRow[];
}): WorkspaceAvisosDTO {
  const { periodType, period, targets, snapshot, metricDays } = input;
  const collectedAt = snapshot?.collectedAt.toISOString() ?? null;

  const sourceStatuses = {
    vtex: snapshot?.vtexStatus ?? ("missing" as const),
    ga4: snapshot?.ga4Status ?? ("missing" as const),
    gsc: snapshot?.gscStatus ?? ("missing" as const),
  };

  const metricsBySource = new Map<AvisosSourceKey, AvisosMetricCard[]>();
  for (const def of METRIC_DEFINITIONS) {
    const target = targetFor(targets, def.key, periodType);
    const current = snapshot
      ? metricValueFromSnapshot(def.key, snapshot)
      : null;
    const status =
      target !== null
        ? computePaceStatus({
            metricKey: def.key,
            current,
            target,
            elapsedDays: period.elapsedDays,
            totalDays: period.totalDays,
          })
        : null;

    const card: AvisosMetricCard = {
      key: def.key,
      label: def.label,
      source: def.source,
      unit: def.unit,
      target,
      current,
      progressPct: computeProgressPct(current, target),
      projection:
        target !== null
          ? computeProjection(
              def.key,
              current,
              period.elapsedDays,
              period.totalDays,
            )
          : null,
      status,
      hasTarget: target !== null,
      targetHitStatus: computeMetricTargetHitStatus({ current, target }),
      series: buildMetricCumulativeSeries({
        metricKey: def.key,
        period,
        days: metricDays,
        sourceStatuses,
        terminalValue: current,
      }),
    };

    const list = metricsBySource.get(def.source) ?? [];
    list.push(card);
    metricsBySource.set(def.source, list);
  }

  const sourceOrder: AvisosSourceKey[] = ["vtex", "ga4", "gsc"];
  const sources: AvisosSourceBlock[] = sourceOrder.map((source) => {
    const statusInfo = snapshot
      ? sourceStatusFromSnapshot(snapshot, source)
      : { status: "missing" as const, error: null };
    return {
      source,
      label: SOURCE_LABELS[source],
      status: statusInfo.status,
      error: statusInfo.error,
      metrics: metricsBySource.get(source) ?? [],
    };
  });

  return {
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    periodType,
    periodLabel: period.label,
    periodStart: period.start,
    periodEnd: period.end,
    collectedAt,
    snapshotStale: input.snapshotStale,
    sources,
  };
}
