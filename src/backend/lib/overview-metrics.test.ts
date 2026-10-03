import { describe, expect, it } from "vitest";

import { buildOverviewDto } from "@/backend/lib/overview-metrics";
import type { WorkspaceOverviewListItem } from "@/backend/models/workspace.model";

const baseWorkspace: WorkspaceOverviewListItem = {
  id: "ws1",
  name: "Loja Teste",
  siteUrl: "https://loja.example",
  vtexAccountName: "acct",
  vtexEnvironment: "vtexcommercestable",
  hasVtexAppKey: true,
  hasVtexAppToken: true,
  hasGaServiceAccount: true,
  gaPropertyId: "123456789",
  hasClarityToken: true,
};

describe("overview-metrics", () => {
  it("monta hero com receita VTEX e visitantes GA4", () => {
    const dto = buildOverviewDto({
      workspace: baseWorkspace,
      periodLabel: "Últimos 30 dias",
      clarityPeriodNote: "Clarity: últimos 3 dias",
      collectedAt: "2026-01-01T00:00:00.000Z",
      vtex: {
        normalized: {
          orders: [],
          inventory: [],
          pricing: [],
          categories: [],
          shipments: [],
          checkout: {},
          collectedAt: "2026-01-01T00:00:00.000Z",
        },
        collectorResults: [{ collector: "orders", status: "ok" }],
        dataGaps: [],
        metrics: { order_count: 10, revenue: 1000, canceled: 2 },
      },
      measurement: {
        collectedAt: "2026-01-01T00:00:00.000Z",
        analytics: {
          totals: {
            totalUsers: 500,
            sessions: 600,
            ecommercePurchases: 5,
          },
          funnel_rates: { session_to_purchase_pct: 2.5 },
        },
        searchConsole: null,
        clarity: null,
        sourceResults: [
          { source: "analytics", status: "ok" },
          { source: "search-console", status: "failed", error: "403" },
          { source: "clarity", status: "failed", error: "token" },
        ],
        dataGaps: [],
      },
    });

    expect(dto.hero.find((k) => k.id === "revenue")?.value).toContain("1.000");
    expect(dto.hero.find((k) => k.id === "visitors")?.value).toBe("500");
    expect(dto.sources.analytics.dot).toBe("ok");
    expect(dto.sources["search-console"].dot).toBe("failed");
    expect(dto.vtexVisual?.orderCount).toBe(10);
  });
});
