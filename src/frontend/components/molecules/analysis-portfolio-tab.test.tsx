/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnalysisPortfolioTab } from "@/frontend/components/molecules/analysis-portfolio-tab";
import type { AnalysisPortfolioJson } from "@/backend/lib/analysis/portfolio/types";

const samplePortfolio: AnalysisPortfolioJson = {
  available: true,
  populationOrders: 10,
  cappedAtMax: false,
  skuCount: 1,
  revenueLineTotal: 100,
  revenueOrderTotal: 100,
  reconciliationGapPct: 0,
  abcSlices: [
    { class: "A", skuCount: 1, revenueSharePct: 100 },
    { class: "B", skuCount: 0, revenueSharePct: 0 },
    { class: "C", skuCount: 0, revenueSharePct: 0 },
  ],
  clusters: [],
  topSkus: [
    {
      key: "sku:1",
      skuId: "1",
      productId: null,
      name: "Produto teste",
      detailUrl: null,
      revenue: 100,
      quantity: 2,
      orderCount: 2,
      canceledOrderCount: 0,
      cancelRatePct: 0,
      abcClass: "A",
      clusterId: null,
      clusterLabel: null,
      riskLevel: null,
      ga4: null,
      gsc: null,
    },
  ],
  risks: [],
  dataGaps: [],
  llmSummary: "teste",
};

describe("AnalysisPortfolioTab", () => {
  it("mostra ranking quando portfólio disponível", () => {
    render(<AnalysisPortfolioTab portfolio={samplePortfolio} />);
    expect(screen.getByText("Produto teste")).toBeInTheDocument();
    expect(screen.getByText(/Ranking por receita/i)).toBeInTheDocument();
  });

  it("mostra empty quando portfólio ausente", () => {
    render(<AnalysisPortfolioTab portfolio={undefined} />);
    expect(screen.getByText(/Portfólio indisponível/i)).toBeInTheDocument();
  });
});
