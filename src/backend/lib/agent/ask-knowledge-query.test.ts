import { describe, expect, it } from "vitest";

import {
  buildAskKnowledgeSearchQueries,
  isVtexAdminNavigationQuery,
} from "@/backend/lib/agent/ask-knowledge-query";

describe("isVtexAdminNavigationQuery", () => {
  it("detecta navegação no admin operacional", () => {
    expect(
      isVtexAdminNavigationQuery(
        "Como chego na tela de políticas comerciais no Admin VTEX?",
      ),
    ).toBe(true);
  });

  it("detecta VTEX IO e Site Editor", () => {
    expect(
      isVtexAdminNavigationQuery(
        "Onde fica o Site Editor no admin da VTEX IO?",
      ),
    ).toBe(true);
  });

  it("detecta configuração operacional com VTEX sem citar admin", () => {
    expect(
      isVtexAdminNavigationQuery("Como configuro frete na VTEX?"),
    ).toBe(true);
  });

  it("ignora perguntas genéricas sem contexto de admin", () => {
    expect(isVtexAdminNavigationQuery("O que é conversão?")).toBe(false);
  });
});

describe("buildAskKnowledgeSearchQueries", () => {
  it("retorna só a pergunta quando não é navegação admin", () => {
    expect(buildAskKnowledgeSearchQueries("O que é GA4?")).toEqual([
      "O que é GA4?",
    ]);
  });

  it("expande buscas para admin e IO", () => {
    const queries = buildAskKnowledgeSearchQueries(
      "Como acesso o CMS no VTEX IO pelo admin?",
    );
    expect(queries[0]).toContain("VTEX IO");
    expect(queries.some((q) => q.includes("site editor"))).toBe(true);
    expect(queries.some((q) => q.includes("admin vtex"))).toBe(true);
  });
});
