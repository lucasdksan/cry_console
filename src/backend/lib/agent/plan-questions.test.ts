import { describe, expect, it } from "vitest";

import {
  formatPlanQuestionAnswers,
  parsePlanQuestionsFromText,
} from "@/backend/lib/agent/plan-questions";

describe("parsePlanQuestionsFromText", () => {
  it("extrai perguntas estruturadas com sugestões", () => {
    const part = parsePlanQuestionsFromText(`Antes de montar o plano, preciso de alguns detalhes.

## Pergunta: Qual horizonte você quer priorizar?
- 30 dias
- 90 dias
- 6 meses

## Pergunta: Qual canal é foco?
- Orgânico
- Pago
- Direct
`);
    expect(part?.questions).toHaveLength(2);
    expect(part?.questions[0]?.suggestions).toEqual([
      "30 dias",
      "90 dias",
      "6 meses",
    ]);
    expect(part?.intro).toMatch(/Antes de montar/);
  });
});

describe("formatPlanQuestionAnswers", () => {
  it("formata respostas para o próximo turno", () => {
    const text = formatPlanQuestionAnswers({
      questions: [{ id: "q-1", prompt: "Horizonte?", suggestions: [] }],
      answers: { "q-1": "90 dias" },
    });
    expect(text).toContain("Horizonte?: 90 dias");
  });
});
