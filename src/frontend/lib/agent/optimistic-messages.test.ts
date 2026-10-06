import { describe, expect, it } from "vitest";

import type { AgentMessagePublic } from "@/backend/lib/agent/types";
import {
  createOptimisticUserMessage,
  markPlanQuestionsAnsweredInMessages,
} from "@/frontend/lib/agent/optimistic-messages";

describe("optimistic agent messages", () => {
  it("cria mensagem de usuário com id temporário", () => {
    const message = createOptimisticUserMessage("Olá");
    expect(message.role).toBe("user");
    expect(message.content).toBe("Olá");
    expect(message.id.startsWith("optimistic-")).toBe(true);
  });

  it("marca plan_questions como respondido", () => {
    const messages: AgentMessagePublic[] = [
      {
        id: "a1",
        role: "assistant",
        content: "Perguntas",
        parts: [
          {
            type: "plan_questions",
            questions: [{ id: "q-1", prompt: "Horizonte?", suggestions: [] }],
            answered: false,
          },
        ],
        modelSource: null,
        providerKey: null,
        model: null,
        createdAt: new Date().toISOString(),
      },
    ];
    const next = markPlanQuestionsAnsweredInMessages(messages, "a1");
    expect(next[0]?.parts[0]?.type).toBe("plan_questions");
    if (next[0]?.parts[0]?.type === "plan_questions") {
      expect(next[0].parts[0].answered).toBe(true);
    }
  });
});
