import type { AgentChatMode } from "@/generated/prisma/client";

import {
  buildActionPlanPartFromNarrative,
  shouldAttachActionPlanFromCommand,
} from "@/backend/lib/agent/action-plan-part";
import {
  buildChartPart,
  buildSkillChartPart,
  resolveChartMetricForCommand,
  shouldAttachChartFromCommand,
} from "@/backend/lib/agent/chart";
import type { ResolvedAgentSkillTurn } from "@/backend/lib/agent/skill";
import { metricLabelsForKeys } from "@/backend/lib/agent/skill";
import type { AgentWorkspaceCommand } from "@/backend/lib/agent/command";
import type { AgentWorkspaceContext } from "@/backend/lib/agent/context";
import {
  buildFunnelPartFromMeasurement,
  shouldAttachFunnelFromCommand,
} from "@/backend/lib/agent/funnel";
import { extractAgentMarkers } from "@/backend/lib/agent/markers";
import {
  buildProjectionPart,
  resolveProjectionMetricForCommand,
  shouldAttachProjectionFromCommand,
} from "@/backend/lib/agent/projection";
import type {
  AgentMessageParts,
  AgentPlanArtifacts,
} from "@/backend/lib/agent/types";

export type BuildAgentPartsInput = {
  mode: AgentChatMode;
  text: string;
  workspaceContext: AgentWorkspaceContext | null;
  workspaceCommand?: AgentWorkspaceCommand;
  replayArtifacts?: AgentPlanArtifacts;
  agentSkillTurn?: ResolvedAgentSkillTurn | null;
};

export type BuildAgentPartsResult = {
  content: string;
  parts: AgentMessageParts["parts"];
  artifacts: AgentPlanArtifacts;
};

function emptyArtifacts(): AgentPlanArtifacts {
  return {
    chartMetrics: [],
    projectionMetrics: [],
    funnel: false,
    actionPlan: false,
  };
}

function resolveAttachFlags(input: {
  workspaceCommand?: AgentWorkspaceCommand;
  markers: ReturnType<typeof extractAgentMarkers>;
  replay?: AgentPlanArtifacts;
}): AgentPlanArtifacts {
  if (input.replay) {
    return input.replay;
  }
  const { markers, workspaceCommand } = input;
  const artifacts = emptyArtifacts();

  if (shouldAttachChartFromCommand(workspaceCommand, markers.chartMetric)) {
    const key = resolveChartMetricForCommand({
      command: workspaceCommand,
      markerMetric: markers.chartMetric,
    });
    if (key) {
      artifacts.chartMetrics.push(key);
    }
  }

  if (
    shouldAttachProjectionFromCommand(
      workspaceCommand,
      markers.projectionMetric,
    )
  ) {
    const key = resolveProjectionMetricForCommand({
      command: workspaceCommand,
      markerMetric: markers.projectionMetric,
    });
    if (key) {
      artifacts.projectionMetrics.push(key);
    }
  }

  artifacts.funnel = shouldAttachFunnelFromCommand(
    workspaceCommand,
    markers.funnel,
  );
  artifacts.actionPlan = shouldAttachActionPlanFromCommand(
    workspaceCommand,
    markers.actionPlan,
  );

  return artifacts;
}

function appendUnavailableNotes(input: {
  content: string;
  workspaceCommand?: AgentWorkspaceCommand;
  markers: ReturnType<typeof extractAgentMarkers>;
  parts: AgentMessageParts["parts"];
}): string {
  let content = input.content;
  const hasProjection = input.parts.some((p) => p.type === "projection");
  const hasFunnel = input.parts.some((p) => p.type === "funnel");
  const hasChart = input.parts.some((p) => p.type === "chart");

  if (
    !hasChart &&
    (input.workspaceCommand?.kind === "chart" ||
      input.workspaceCommand?.kind === "search")
  ) {
    content += "\n\n_(Série indisponível no período salvo.)_";
  }
  if (
    !hasProjection &&
    (input.workspaceCommand?.kind === "projection" ||
      input.markers.projectionMetric)
  ) {
    content += "\n\n_(Projeção indisponível para a métrica no período.)_";
  }
  if (
    !hasFunnel &&
    (input.workspaceCommand?.kind === "funnel" || input.markers.funnel)
  ) {
    content +=
      "\n\n_(Funil GA4 indisponível — rode a análise da loja para atualizar volumes.)_";
  }
  return content;
}

export function buildAgentMessageParts(
  input: BuildAgentPartsInput,
): BuildAgentPartsResult {
  const skillTurn = input.agentSkillTurn ?? null;
  const markers = skillTurn
    ? {
        cleanedText: input.text.trim(),
        chartMetric: null,
        projectionMetric: null,
        funnel: false,
        actionPlan: false,
      }
    : extractAgentMarkers(input.text);
  let content = markers.cleanedText || input.text.trim();
  const artifacts = skillTurn
    ? emptyArtifacts()
    : resolveAttachFlags({
        workspaceCommand: input.workspaceCommand,
        markers,
        replay: input.replayArtifacts,
      });

  const parts: AgentMessageParts["parts"] = [];
  const ctx = input.workspaceContext;

  if (skillTurn && ctx && skillTurn.skill.metricKeys.length > 0) {
    const built = buildSkillChartPart({
      metricKeys: skillTurn.skill.metricKeys,
      period: ctx.period,
      metricDays: ctx.metricDays,
      claritySnapshots: ctx.claritySnapshots,
      sourceStatuses: ctx.sourceStatuses,
      snapshotMetricValues: ctx.snapshotMetricValues,
      skillName: skillTurn.skill.name,
    });
    if (built.chart) {
      parts.push(built.chart);
    }
    if (built.missingKeys.length > 0) {
      const labels = metricLabelsForKeys(built.missingKeys).join(", ");
      content += `\n\n_(Sem série no período: ${labels}.)_`;
    }
  } else if (ctx) {
    for (const metricKey of artifacts.chartMetrics) {
      const chart = buildChartPart({
        metricKey,
        period: ctx.period,
        metricDays: ctx.metricDays,
        sourceStatuses: ctx.sourceStatuses,
        terminalValue: ctx.snapshotMetricValues[metricKey] ?? null,
      });
      if (chart) {
        parts.push(chart);
      }
    }

    for (const metricKey of artifacts.projectionMetrics) {
      const projection = buildProjectionPart({
        metricKey,
        period: ctx.period,
        metricDays: ctx.metricDays,
        sourceStatuses: ctx.sourceStatuses,
      });
      if (projection) {
        parts.push(projection);
      }
    }

    if (artifacts.funnel) {
      const funnel = buildFunnelPartFromMeasurement(ctx.measurement);
      if (funnel) {
        parts.push(funnel);
      }
    }

    if (artifacts.actionPlan) {
      parts.push(buildActionPlanPartFromNarrative(ctx.narrative));
    }
  } else if (artifacts.actionPlan) {
    parts.push(buildActionPlanPartFromNarrative(null));
  }

  if (input.mode !== "plan" && !skillTurn) {
    content = appendUnavailableNotes({
      content,
      workspaceCommand: input.workspaceCommand,
      markers,
      parts,
    });
  }

  if (skillTurn && !ctx) {
    content +=
      "\n\n_(Nenhuma loja vinculada à sessão — não foi possível montar gráfico.)_";
  }

  return { content, parts, artifacts };
}
