import type { AgentMessagePublic } from "@/backend/lib/agent/types";

export function createOptimisticUserMessage(
  content: string,
): AgentMessagePublic {
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    role: "user",
    content,
    parts: [],
    modelSource: null,
    providerKey: null,
    model: null,
    createdAt: new Date().toISOString(),
  };
}

export function markPlanQuestionsAnsweredInMessages(
  messages: AgentMessagePublic[],
  assistantMessageId: string | null | undefined,
): AgentMessagePublic[] {
  if (!assistantMessageId) {
    return messages;
  }
  return messages.map((message) => {
    if (message.id !== assistantMessageId) {
      return message;
    }
    return {
      ...message,
      parts: message.parts.map((part) =>
        part.type === "plan_questions" ? { ...part, answered: true } : part,
      ),
    };
  });
}

export function isOptimisticMessageId(id: string): boolean {
  return id.startsWith("optimistic-");
}
