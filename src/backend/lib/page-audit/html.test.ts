import { describe, expect, it } from "vitest";

import { parseHtmlSignals } from "@/backend/lib/page-audit/html";

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <title>Produto teste | Loja</title>
  <meta name="description" content="Descrição longa o suficiente para SEO básico na página de produto." />
  <link rel="canonical" href="https://loja.example/p/sku" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script type="application/ld+json">{"@type":"Product","name":"X"}</script>
</head>
<body>
  <h1>Produto teste</h1>
  <img src="/a.jpg" />
  <button>Comprar agora</button>
</body>
</html>`;

describe("parseHtmlSignals", () => {
  it("extrai title, canonical, H1, JSON-LD e CTA", () => {
    const signals = parseHtmlSignals(SAMPLE_HTML);
    expect(signals.title).toContain("Produto teste");
    expect(signals.canonical).toBe("https://loja.example/p/sku");
    expect(signals.headings.some((h) => h.level === 1)).toBe(true);
    expect(signals.jsonLdBlocks.length).toBe(1);
    expect(signals.hasPurchaseCta).toBe(true);
    expect(signals.imagesWithoutAlt).toBe(1);
    expect(signals.viewport).toBe(true);
  });
});
