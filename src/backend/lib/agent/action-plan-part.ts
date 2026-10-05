import type { AnalysisNarrativeJson } from "@/backend/lib/analysis/types";
import { PILLAR_TITLES } from "@/backend/lib/analysis/types";
import type { AgentWorkspaceCommand } from "@/backend/lib/agent/command";
import type { AgentActionPlanPart } from "@/backend/lib/agent/types";

export function buildActionPlanPartFromNarrative(
  narrative: AnalysisNarrativeJson | null,
): AgentActionPlanPart {
  if (!narrative) {
    return { type: "action_plan", items: [], emptyMessage: true };
  }

  const items = narrative.pillars.flatMap((pillar) =>
    pillar.action_plan.map((item) => ({
      pillar: pillar.pillar,
      pillarTitle: PILLAR_TITLES[pillar.pillar],
      priority: item.priority,
      title: item.title,
      problem: item.problem,
      action: item.action,
      actionSteps: item.action_steps,
      targetMetric: item.target_metric,
      expectedImpact: item.expected_impact,
    })),
  );

  return {
    type: "action_plan",
    items,
    emptyMessage: items.length === 0,
  };
}

export function shouldAttachActionPlanFromCommand(
  command: AgentWorkspaceCommand | undefined,
  markerActionPlan: boolean,
): boolean {
  if (markerActionPlan) {
    return true;
  }
  return command?.kind === "action_plan";
}
