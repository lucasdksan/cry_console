import { describe, expect, it } from "vitest";

import { buildSeoAudit } from "@/backend/lib/page-audit/heuristics";
import type { HtmlSignals, PageSpeedSignals } from "@/backend/lib/page-audit/types";

const html: HtmlSignals = {
  title: null,
  description: null,
  canonical: null,
  robots: null,
  lang: null,
  viewport: false,
  headings: [],
  jsonLdBlocks: [],
  imagesWithoutAlt: 0,
  imagesSampled: 0,
  hasPurchaseCta: false,
  originChecks: null,
};

const pagespeed: PageSpeedSignals = {
  performanceScore: 40,
  lcp: 4000,
  fcp: 2000,
  cls: 0.2,
  tbt: 600,
  ttfb: 800,
  inp: 300,
};

describe("buildSeoAudit", () => {
  it("marca title ausente e performance baixa", () => {
    const audit = buildSeoAudit({ html, pagespeed, storeContext: null });
    expect(audit.findings.some((f) => f.id === "MISSING_TITLE")).toBe(true);
    expect(audit.findings.some((f) => f.id === "LOW_PERFORMANCE")).toBe(true);
    expect(audit.healthScore).not.toBeNull();
  });
});
