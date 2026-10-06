import { isValidPlanMarkdown } from "@/backend/lib/agent/prompt";

export type PlanAssistantTurnKind = "questions" | "overview";

export type PlanConversationPhase = "discovery" | "overview";

/** Resposta do assistente no modo Plan: overview só com markdown de plano válido. */
export function classifyPlanAssistantTurn(text: string): PlanAssistantTurnKind {
  return isValidPlanMarkdown(text) ? "overview" : "questions";
}

/** Fase do prompt Plan: discovery no primeiro turno; overview após o usuário responder perguntas. */
export function resolvePlanConversationPhase(
  history: { role: "user" | "assistant"; content: string }[],
): PlanConversationPhase {
  if (history.length === 0) {
    return "discovery";
  }
  const last = history[history.length - 1];
  return last?.role === "assistant" ? "overview" : "discovery";
}
