import { describe, expect, it } from "vitest";

import {
  classifyPlanAssistantTurn,
  resolvePlanConversationPhase,
} from "@/backend/lib/agent/plan-turn";

describe("classifyPlanAssistantTurn", () => {
  it("trata texto sem heading como perguntas", () => {
    expect(
      classifyPlanAssistantTurn(
        "Para montar o plano, preciso saber:\n\n1. Qual horizonte?\n2. Qual canal?",
      ),
    ).toBe("questions");
  });

  it("trata markdown de plano como overview", () => {
    expect(
      classifyPlanAssistantTurn(
        "# Plano de conversão\n\n## Overview\n\nResumo com detalhes suficientes.",
      ),
    ).toBe("overview");
  });
});

describe("resolvePlanConversationPhase", () => {
  it("discovery sem histórico", () => {
    expect(resolvePlanConversationPhase([])).toBe("discovery");
  });

  it("overview quando o último turno foi do assistente", () => {
    expect(
      resolvePlanConversationPhase([
        { role: "user", content: "Melhorar conversões" },
        { role: "assistant", content: "1. Horizonte?" },
      ]),
    ).toBe("overview");
  });
});
