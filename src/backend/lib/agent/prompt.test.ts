import { describe, expect, it } from "vitest";

import {
  AGENT_RESPONSE_STYLE_HINT,
  buildAgentPrompt,
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

  it("modo plan não menciona marcadores visuais na instrução base", () => {
    const instruction = buildAgentSystemInstruction("plan");
    expect(instruction).toMatch(/Não use marcadores visuais/);
  });

  it("ask proíbe métricas comerciais inventadas e cita Sentry", () => {
    const instruction = buildAgentSystemInstruction("ask");
    expect(instruction).toMatch(/Observabilidade \(Sentry\)/);
    expect(instruction).toMatch(/Não invente métricas comerciais/);
  });
});

describe("buildAgentPrompt", () => {
  it("inclui fase de descoberta sem histórico", () => {
    const prompt = buildAgentPrompt({
      mode: "plan",
      userMessage: "Melhorar conversões",
      history: [],
    });
    expect(prompt).toMatch(/Fase de descoberta/);
  });

  it("inclui Observabilidade (Sentry) em agent, plan e ask", () => {
    const section = "Fonte: Sentry. Período: teste.";
    for (const mode of ["agent", "plan", "ask"] as const) {
      const prompt = buildAgentPrompt({
        mode,
        userMessage: "Analisar erros",
        history: [],
        observabilitySection: section,
      });
      expect(prompt).toContain("## Observabilidade (Sentry)");
      expect(prompt).toContain(section);
    }
  });

  it("ask com observabilidade usa catálogo sem rótulo fonte única", () => {
    const prompt = buildAgentPrompt({
      mode: "ask",
      userMessage: "O que é Sentry?",
      history: [],
      observabilitySection: "Issues: nenhuma.",
    });
    expect(prompt).toContain("## Catálogo\n");
    expect(prompt).not.toContain("## Catálogo (fonte única)");
  });

  it("ask sem observabilidade mantém catálogo como fonte única", () => {
    const prompt = buildAgentPrompt({
      mode: "ask",
      userMessage: "O que é GA4?",
      history: [],
    });
    expect(prompt).toContain("## Catálogo (fonte única)");
    expect(prompt).not.toContain("## Observabilidade (Sentry)");
  });

  it("ask com Help Center inclui caminho e instrução passo a passo", () => {
    const prompt = buildAgentPrompt({
      mode: "ask",
      userMessage: "Como enviar feedback no Admin?",
      history: [],
      knowledgeChunks: [
        {
          id: "1",
          platform: "VTEX Help Center",
          title: "Admin VTEX",
          keywords: ["vtex"],
          content: "1. Clique na Central de Informações.",
          section: "Tutoriais > Admin VTEX > Fornecendo feedbacks",
          url: "https://help.vtex.com/pt/docs/tutorials/admin-vtex-comece-aqui",
        },
      ],
    });
    expect(prompt).toContain("Base de conhecimento (VTEX Help Center");
    expect(prompt).toContain("Caminho no Help Center:");
    expect(prompt).toMatch(/passos numerados/);
    expect(prompt).toMatch(/Admin VTEX \(operacional\/legacy\)/);
  });
});
