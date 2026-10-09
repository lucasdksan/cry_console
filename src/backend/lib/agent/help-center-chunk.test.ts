import { describe, expect, it } from "vitest";

import {
  buildHelpCenterChunksFromPage,
  chunkHelpCenterPageText,
  helpCenterChunkId,
  inferHelpCenterSourceFromUrl,
} from "@/backend/lib/agent/help-center-chunk";

describe("helpCenterChunkId", () => {
  it("é determinístico para a mesma entrada", () => {
    const input = { url: "https://help.vtex.com/pt/docs/tutorials/foo", title: "Foo", index: 0 };
    expect(helpCenterChunkId(input)).toBe(helpCenterChunkId(input));
  });
});

describe("chunkHelpCenterPageText", () => {
  it("divide por cabeçalhos markdown", () => {
    const text = "## Um\nConteúdo A\n\n### Dois\nConteúdo B";
    const chunks = chunkHelpCenterPageText(text, 500);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]).toContain("Conteúdo A");
    expect(chunks[1]).toContain("Conteúdo B");
  });

  it("parte blocos grandes respeitando maxChars", () => {
    const body = "a".repeat(2500);
    const chunks = chunkHelpCenterPageText(body, 800);
    expect(chunks.length).toBeGreaterThan(2);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(800);
    }
  });
});

describe("buildHelpCenterChunksFromPage", () => {
  it("gera ids distintos por índice", () => {
    const chunks = buildHelpCenterChunksFromPage({
      url: "https://help.vtex.com/pt/docs/tutorials/teste",
      title: "Teste",
      section: "Suporte",
      text: "## A\n".repeat(50) + "x".repeat(2000),
      source: "tutorials",
    });
    expect(chunks.length).toBeGreaterThan(1);
    const ids = new Set(chunks.map((c) => c.id));
    expect(ids.size).toBe(chunks.length);
    expect(chunks.some((c) => c.section?.includes("Suporte"))).toBe(true);
  });

  it("inclui cabeçalho markdown no section de cada chunk", () => {
    const chunks = buildHelpCenterChunksFromPage({
      url: "https://help.vtex.com/pt/docs/tutorials/teste",
      title: "Teste",
      section: "Tutoriais > Admin VTEX",
      text: "## Menu de navegação\nConteúdo\n\n### Central\nMais",
      source: "tutorials",
    });
    expect(chunks[0]?.section).toBe("Tutoriais > Admin VTEX > Menu de navegação");
  });
});

describe("inferHelpCenterSourceFromUrl", () => {
  it("identifica tutoriais", () => {
    expect(
      inferHelpCenterSourceFromUrl(
        "https://help.vtex.com/pt/docs/tutorials/como-funciona-o-suporte-da-vtex",
      ),
    ).toBe("tutorials");
  });
});
