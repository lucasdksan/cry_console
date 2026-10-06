import type { WorkspaceMetricKey } from "@/generated/prisma/client";
import {
  buildMetricCumulativeSeries,
  type MetricSeriesPoint,
} from "@/backend/lib/workspace/metric-series";
import type { MetricDayRow } from "@/backend/models/workspace-metric.model";
import type { WorkspaceCalendarPeriod } from "@/backend/lib/workspace/period";
import type { AgentWorkspaceCommand } from "@/backend/lib/agent/command";
import {
  buildClarityMetricSeries,
  isClarityWorkspaceMetricKey,
} from "@/backend/lib/agent/clarity-series";
import {
  metricUnitFamily,
  type AgentSkillUnitFamily,
} from "@/backend/lib/agent/skill";
import type { ClaritySnapshotRow } from "@/backend/models/workspace-clarity-snapshot.model";
import { CHART_METRIC_LABELS } from "@/backend/lib/agent/types";
import type { AgentChartPart, AgentChartSeries } from "@/backend/lib/agent/types";

const CHART_MARKER_RE = /\[\[chart:([a-z0-9_]+)\]\]/gi;

const METRIC_HINTS: Record<string, WorkspaceMetricKey> = {
  receita: "vtex_revenue",
  revenue: "vtex_revenue",
  pedido: "vtex_orders",
  pedidos: "vtex_orders",
  sessao: "ga4_sessions",
  sessões: "ga4_sessions",
  sessoes: "ga4_sessions",
  conversao: "ga4_conversion_pct",
  conversão: "ga4_conversion_pct",
  clique: "gsc_clicks",
  cliques: "gsc_clicks",
  gsc: "gsc_clicks",
  busca: "gsc_clicks",
};

export function resolveMetricFromHint(hint: string | undefined): WorkspaceMetricKey {
  const normalized = (hint ?? "receita").toLowerCase();
  for (const [key, metric] of Object.entries(METRIC_HINTS)) {
    if (normalized.includes(key)) {
      return metric;
    }
  }
  return "vtex_revenue";
}

export function resolveChartMetricForCommand(input: {
  command?: AgentWorkspaceCommand;
  markerMetric: WorkspaceMetricKey | null;
}): WorkspaceMetricKey | null {
  if (input.markerMetric) {
    return input.markerMetric;
  }
  const command = input.command;
  if (!command) {
    return null;
  }
  if (command.kind === "chart") {
    return resolveMetricFromHint(command.metricHint);
  }
  if (command.kind === "search") {
    return "gsc_clicks";
  }
  if (command.kind === "health" && command.pillar === "aquisicao") {
    return "ga4_sessions";
  }
  return null;
}

export function shouldAttachChartFromCommand(
  command: AgentWorkspaceCommand | undefined,
  markerMetric: WorkspaceMetricKey | null,
): boolean {
  if (markerMetric) {
    return true;
  }
  if (!command) {
    return false;
  }
  if (command.kind === "chart" || command.kind === "search") {
    return true;
  }
  if (command.kind === "health" && command.pillar === "aquisicao") {
    return true;
  }
  return false;
}

export function isWorkspaceMetricKey(value: string): value is WorkspaceMetricKey {
  return value in CHART_METRIC_LABELS;
}

export function extractChartMarker(text: string): {
  cleanedText: string;
  metricKey: WorkspaceMetricKey | null;
} {
  let metricKey: WorkspaceMetricKey | null = null;
  const cleanedText = text
    .replace(CHART_MARKER_RE, (_, raw: string) => {
      if (isWorkspaceMetricKey(raw)) {
        metricKey = raw;
      }
      return "";
    })
    .trim();
  return { cleanedText, metricKey };
}

function seriesHasDisplayableValues(points: MetricSeriesPoint[]): boolean {
  return points.some((p) => p.value !== null && p.value !== 0);
}

export function buildChartPartForWorkspaceCommand(input: {
  workspaceCommand?: AgentWorkspaceCommand;
  markerMetric?: WorkspaceMetricKey | null;
  period: WorkspaceCalendarPeriod;
  metricDays: MetricDayRow[];
  sourceStatuses: {
    vtex: "ok" | "failed" | "missing";
    ga4: "ok" | "failed" | "missing";
    gsc: "ok" | "failed" | "missing";
  };
  snapshotMetricValues: Partial<Record<WorkspaceMetricKey, number | null>>;
}): AgentChartPart | null {
  const metricKey = resolveChartMetricForCommand({
    command: input.workspaceCommand,
    markerMetric: input.markerMetric ?? null,
  });
  if (
    !metricKey ||
    !shouldAttachChartFromCommand(
      input.workspaceCommand,
      input.markerMetric ?? null,
    )
  ) {
    return null;
  }
  const terminalValue = input.snapshotMetricValues[metricKey] ?? null;
  return buildChartPart({
    metricKey,
    period: input.period,
    metricDays: input.metricDays,
    sourceStatuses: input.sourceStatuses,
    terminalValue,
  });
}

export function buildChartPart(input: {
  metricKey: WorkspaceMetricKey;
  period: WorkspaceCalendarPeriod;
  metricDays: MetricDayRow[];
  sourceStatuses: {
    vtex: "ok" | "failed" | "missing";
    ga4: "ok" | "failed" | "missing";
    gsc: "ok" | "failed" | "missing";
  };
  terminalValue?: number | null;
}): AgentChartPart | null {
  const points: MetricSeriesPoint[] = buildMetricCumulativeSeries({
    metricKey: input.metricKey,
    period: input.period,
    days: input.metricDays,
    sourceStatuses: input.sourceStatuses,
    terminalValue: input.terminalValue ?? null,
  });

  if (!seriesHasDisplayableValues(points)) {
    return null;
  }

  const label = CHART_METRIC_LABELS[input.metricKey];
  return {
    type: "chart",
    title: label,
    metricKey: input.metricKey,
    label,
    points,
  };
}

function axisForUnitFamily(
  family: AgentSkillUnitFamily,
  familyAxis: Map<AgentSkillUnitFamily, "left" | "right">,
): "left" | "right" {
  return familyAxis.get(family) ?? "left";
}

function buildFamilyAxisMap(
  keys: WorkspaceMetricKey[],
): Map<AgentSkillUnitFamily, "left" | "right"> {
  const families = [...new Set(keys.map(metricUnitFamily))];
  const map = new Map<AgentSkillUnitFamily, "left" | "right">();
  if (families.length <= 1) {
    for (const family of families) {
      map.set(family, "left");
    }
    return map;
  }
  map.set(families[0]!, "left");
  map.set(families[1]!, "right");
  return map;
}

export type SkillChartBuildResult = {
  chart: AgentChartPart | null;
  presentKeys: WorkspaceMetricKey[];
  missingKeys: WorkspaceMetricKey[];
};

export function buildSkillChartPart(input: {
  metricKeys: WorkspaceMetricKey[];
  period: WorkspaceCalendarPeriod;
  metricDays: MetricDayRow[];
  claritySnapshots: ClaritySnapshotRow[];
  sourceStatuses: {
    vtex: "ok" | "failed" | "missing";
    ga4: "ok" | "failed" | "missing";
    gsc: "ok" | "failed" | "missing";
    clarity: "ok" | "failed" | "missing";
  };
  snapshotMetricValues: Partial<Record<WorkspaceMetricKey, number | null>>;
  skillName: string;
}): SkillChartBuildResult {
  if (input.metricKeys.length === 0) {
    return { chart: null, presentKeys: [], missingKeys: [] };
  }

  const familyAxis = buildFamilyAxisMap(input.metricKeys);
  const series: AgentChartSeries[] = [];
  const presentKeys: WorkspaceMetricKey[] = [];
  const missingKeys: WorkspaceMetricKey[] = [];

  for (const metricKey of input.metricKeys) {
    const points = isClarityWorkspaceMetricKey(metricKey)
      ? buildClarityMetricSeries({
          metricKey,
          period: input.period,
          snapshots: input.claritySnapshots,
          terminalValue: input.snapshotMetricValues[metricKey] ?? null,
        })
      : buildMetricCumulativeSeries({
          metricKey,
          period: input.period,
          days: input.metricDays,
          sourceStatuses: input.sourceStatuses,
          terminalValue: input.snapshotMetricValues[metricKey] ?? null,
        });
    if (!seriesHasDisplayableValues(points)) {
      missingKeys.push(metricKey);
      continue;
    }
    presentKeys.push(metricKey);
    const unit = metricUnitFamily(metricKey);
    series.push({
      metricKey,
      label: CHART_METRIC_LABELS[metricKey],
      unit,
      axis: axisForUnitFamily(unit, familyAxis),
      points,
    });
  }

  if (series.length === 0) {
    return { chart: null, presentKeys, missingKeys: input.metricKeys };
  }

  const title =
    series.length === 1
      ? series[0]!.label
      : `${input.skillName} — comparativo`;

  return {
    chart: {
      type: "chart",
      title,
      series,
    },
    presentKeys,
    missingKeys,
  };
}
