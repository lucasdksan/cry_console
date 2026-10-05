import { describe, expect, it } from "vitest";

import { buildCroHeuristics } from "@/backend/lib/page-audit/cro";
import { buildSeoAudit } from "@/backend/lib/page-audit/heuristics";
import type { HtmlSignals, PageSpeedSignals } from "@/backend/lib/page-audit/types";

const html: HtmlSignals = {
  title: "Oferta",
  description: "Descrição com texto suficiente para valor percebido na página.",
  canonical: "https://loja.example/",
  robots: null,
  lang: "pt-BR",
  viewport: true,
  headings: [{ level: 1, text: "Oferta" }],
  jsonLdBlocks: ['{"@type":"Product"}'],
  imagesWithoutAlt: 0,
  imagesSampled: 2,
  hasPurchaseCta: true,
  originChecks: { robotsTxtOk: true, sitemapHint: null, pathBlocked: false },
};

const pagespeed: PageSpeedSignals = {
  performanceScore: 85,
  lcp: 2000,
  fcp: 1200,
  cls: 0.05,
  tbt: 150,
  ttfb: 400,
  inp: 120,
};

describe("buildCroHeuristics", () => {
  it("produz eixos e jornada com três etapas", () => {
    const seo = buildSeoAudit({ html, pagespeed, storeContext: null });
    const cro = buildCroHeuristics({ html, pagespeed, seoAudit: seo, storeContext: null });
    expect(cro.journey).toHaveLength(3);
    expect(cro.heuristicScores.m).toBeGreaterThan(0);
    expect(typeof cro.experienceScore).toBe("number");
  });
});
