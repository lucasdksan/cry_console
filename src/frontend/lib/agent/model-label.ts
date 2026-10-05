import type { AgentModelOption } from "@/backend/controllers/agent.controller";

export function formatAgentModelTriggerLabel(
  option: AgentModelOption | undefined,
): string {
  if (!option) {
    return "Modelo";
  }
  const model = option.defaultModel?.trim();
  if (model) {
    return `${option.label} · ${model}`;
  }
  return option.label;
}
