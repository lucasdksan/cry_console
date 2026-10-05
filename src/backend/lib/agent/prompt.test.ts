import { describe, expect, it } from "vitest";

import {
  AGENT_RESPONSE_STYLE_HINT,
  buildAgentSystemInstruction,
  isValidPlanMarkdown,
} from "@/backend/lib/agent/prompt";

describe("isValidPlanMarkdown", () => {
  it("exige heading markdown", () => {
    expect(
      isValidPlanMarkdown("# Plano de ação\n\nPasso 1 com detalhes suficientes."),
    ).toBe(true);
    expect(isValidPlanMarkdown("sem heading")).toBe(false);
  });
});

describe("buildAgentSystemInstruction", () => {
  it("orienta prosa curta no modo agent", () => {
    const instruction = buildAgentSystemInstruction("agent");
    expect(instruction).toContain(AGENT_RESPONSE_STYLE_HINT);
    expect(instruction).toMatch(/Evite títulos com #/);
  });
});
