import type { AgentModelOption } from "@/backend/controllers/agent.controller";

export function formatAgentModelTriggerLabel(
  option: AgentModelOption | undefined,
): string {
  if (!option) {
    return "Modelo";
  }
  if (option.source === "user_provider" && option.groupLabel) {
    return `${option.groupLabel} · ${option.label}`;
  }
  if (option.source === "platform") {
    return `Plataforma · ${option.label}`;
  }
  return option.label;
}
