import { describe, expect, it } from "vitest";

import { buildAuditSetSummary } from "@/backend/lib/page-audit/set-summary";
import type { PageAuditRoleReport } from "@/backend/lib/page-audit/types";

describe("buildAuditSetSummary", () => {
  it("média só das URLs medidas", () => {
    const roles: PageAuditRoleReport[] = [
      {
        role: "home",
        label: "Home",
        url: "https://x/",
        collectedAt: "2026-01-01T00:00:00.000Z",
        status: "complete",
        report: {
          url: "https://x/",
          role: "home",
          collectedAt: "2026-01-01T00:00:00.000Z",
          sources: {
            html: { status: "ok" },
            pagespeed: { status: "ok" },
            store: { status: "missing" },
          },
          html: null,
          pagespeed: { mobile: null, desktop: null },
          storeContext: null,
          seo: {
            healthScore: 80,
            modules: [],
            findings: [],
            summary: { high: 0, medium: 0, low: 0, info: 0 },
          },
          cro: {
            heuristicScores: { m: 0.5, v: 0.5, i: 0.5, f: 0.5, a: 0.5 },
            journey: [],
            experienceScore: 0,
            diagnosticFlags: [],
            laymanSummary: { overview: "", insights: [] },
          },
          disclaimer: "",
        },
        narrative: null,
        aiRoute: null,
        cacheFresh: true,
      },
      {
        role: "category",
        label: "Categoria",
        url: null,
        collectedAt: null,
        status: null,
        report: null,
        narrative: null,
        aiRoute: null,
        cacheFresh: false,
      },
    ];

    const summary = buildAuditSetSummary(roles);
    expect(summary.seoHealthScore).toBe(80);
  });
});
