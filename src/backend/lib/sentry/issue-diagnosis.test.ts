import { describe, expect, it } from "vitest";

import {
  combineIssueAnalysis,
  describeIssueInPortuguese,
  diagnoseObservabilityIssue,
  parseSeerAutofix,
  parseSeerSummary,
  parseSentryLatestEvent,
  proseNeedsPortuguese,
  suggestStorefrontFix,
} from "@/backend/lib/sentry/issue-diagnosis";

describe("suggestStorefrontFix", () => {
  it("aponta o campo vazio e a função", () => {
    const text = suggestStorefrontFix({
      type: "TypeError",
      value: "Cannot read properties of undefined (reading 'price')",
      functionName: "ProductPrice",
      filename: "pdp.js",
    });
    expect(text).toContain("price");
    expect(text).toContain("ProductPrice");
    expect(text.toLowerCase()).not.toContain("sentry");
  });

  it("orienta cache quando o chunk não carrega", () => {
    const text = suggestStorefrontFix({
      type: "ChunkLoadError",
      value: "Loading chunk 12 failed",
      functionName: null,
      filename: null,
    });
    expect(text.toLowerCase()).toContain("cache");
  });
});

describe("describeIssueInPortuguese", () => {
  it("mantém a mensagem quando ela já está em português", () => {
    expect(
      describeIssueInPortuguese({
        type: "Error",
        value: "[exemplo_html] Erro simulado — PDP",
        title: "Error: [exemplo_html] Erro simulado — PDP",
        functionName: "fireDemoError",
      }).headline,
    ).toBe("[exemplo_html] Erro simulado — PDP");
  });

  it("reconhece texto em inglês que precisa de tradução", () => {
    expect(proseNeedsPortuguese("The product is undefined before render")).toBe(
      true,
    );
    expect(
      proseNeedsPortuguese("A função ProductPrice leu um valor vazio."),
    ).toBe(false);
  });
});

describe("diagnoseObservabilityIssue", () => {
  it("monta onde, linha e pilha a partir do evento", () => {
    const diagnosis = diagnoseObservabilityIssue({
      title: "TypeError: Cannot read properties of undefined (reading 'price')",
      culprit: "https://loja.com/p/tenis?token=segredo",
      exceptionType: "TypeError",
      exceptionValue: "Cannot read properties of undefined (reading 'price')",
      filename: null,
      functionName: null,
      pageUrl: "https://loja.com/p/tenis?token=segredo",
      frames: [
        {
          functionName: "render",
          filename: "https://loja.com/_next/static/chunks/vendor.js",
          lineno: 1,
          inApp: false,
          codeLine: null,
        },
        {
          functionName: "ProductPrice",
          filename: "app:///chunks/pdp.js",
          lineno: 42,
          inApp: true,
          codeLine: "return product.price.toFixed(2)",
        },
      ],
    });

    expect(diagnosis.headline).toBe("Campo “price” lido vazio");
    expect(diagnosis.whatHappened).toContain("ProductPrice");
    expect(diagnosis.whatHappened.toLowerCase()).not.toContain("cannot read");
    expect(diagnosis.where).toBe("/p/tenis · ProductPrice em pdp.js:42");
    expect(diagnosis.where).not.toContain("token");
    expect(diagnosis.codeLine).toBe("return product.price.toFixed(2)");
    expect(diagnosis.stackLines[0]).toBe("ProductPrice — pdp.js:42");
    expect(diagnosis.suggestion).toContain("price");
  });
});

describe("parseSentryLatestEvent", () => {
  it("lê exceção, url e o frame da aplicação", () => {
    const parsed = parseSentryLatestEvent({
      culprit: "https://loja.com/p/sku",
      tags: [{ key: "url", value: "https://loja.com/p/sku?email=a@b.com" }],
      entries: [
        {
          type: "exception",
          data: {
            values: [
              {
                type: "TypeError",
                value: "Cannot read properties of undefined (reading 'map')",
                mechanism: { handled: false },
                stacktrace: {
                  frames: [
                    {
                      filename: "https://loja.com/app.js",
                      function: "?",
                      lineno: 10,
                      inApp: false,
                    },
                    {
                      filename: "https://loja.com/plp.js",
                      function: "ProductGrid",
                      lineno: 88,
                      inApp: true,
                      context: [
                        [87, "  const items = data.products"],
                        [88, "  return items.map(renderCard)"],
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    });

    expect(parsed?.exceptionType).toBe("TypeError");
    expect(parsed?.pageUrl).toContain("/p/sku");
    expect(parsed?.handled).toBe(false);
    expect(parsed?.functionName).toBe("ProductGrid");
    expect(parsed?.frames.at(-1)?.codeLine).toBe("return items.map(renderCard)");
  });
});

describe("seer parsers", () => {
  it("lê o resumo de causa", () => {
    expect(
      parseSeerSummary({
        whatsWrong: "O preço chega vazio na PDP.",
        possibleCause: "product não foi carregado antes do render.",
      }),
    ).toEqual({
      whatHappened: "O preço chega vazio na PDP.",
      possibleCause: "product não foi carregado antes do render.",
    });
  });

  it("lê causa e passos de correção já calculados", () => {
    const autofix = parseSeerAutofix({
      autofix: {
        blocks: [
          {
            type: "root_cause",
            data: { one_line_description: "product é undefined na PDP." },
          },
          {
            type: "solution",
            data: {
              one_line_summary: "Não renderizar o preço sem produto.",
              steps: [
                {
                  title: "Guardar o acesso",
                  description: "Retorne cedo se product não existir.",
                },
              ],
            },
          },
        ],
      },
    });

    const combined = combineIssueAnalysis(
      {
        whatHappened: "Quebra ao formatar o preço.",
        possibleCause: "product é undefined na PDP.",
      },
      autofix,
    );

    expect(combined?.suggestion).toBe("Não renderizar o preço sem produto.");
    expect(combined?.steps[0]?.title).toBe("Guardar o acesso");
    expect(combined?.possibleCause).toBe("product é undefined na PDP.");
  });

  it("não repete a causa quando ela é igual ao que aconteceu", () => {
    const combined = combineIssueAnalysis(
      { whatHappened: "Mesmo texto", possibleCause: "Mesmo texto" },
      { rootCause: null, solutionSummary: null, steps: [] },
    );
    expect(combined?.possibleCause).toBeNull();
    expect(combined?.whatHappened).toBe("Mesmo texto");
  });
});
