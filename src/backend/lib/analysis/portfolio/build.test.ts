import { describe, expect, it } from "vitest";

import {
  createPortfolioAccumulator,
} from "@/backend/lib/analysis/portfolio/aggregate";
import { buildAnalysisPortfolio } from "@/backend/lib/analysis/portfolio/build";
import { runPortfolioKmeans } from "@/backend/lib/analysis/portfolio/kmeans";

describe("buildAnalysisPortfolio", () => {
  it("mantém portfólio VTEX quando GA4 falha", () => {
    const acc = createPortfolioAccumulator(100);
    acc.feedPage([
      {
        orderId: "1",
        status: "invoiced",
        value: 10000,
        items: [{ id: "s1", quantity: 1, sellingPrice: 10000, name: "Prod" }],
      },
    ]);
    const result = buildAnalysisPortfolio({
      snapshot: acc.snapshot(),
      ga4Items: null,
      ga4Ok: false,
      gscPages: null,
      gscOk: false,
    });
    expect(result.available).toBe(true);
    expect(result.topSkus).toHaveLength(1);
    expect(result.dataGaps.some((g) => g.source === "ga4")).toBe(true);
  });

  it("k-means é determinístico", () => {
    const vectors = [
      [100, 10, 0, 5],
      [90, 9, 5, 4],
      [10, 1, 0, 2],
      [12, 2, 1, 2],
      [8, 1, 0, 3],
    ];
    const a = runPortfolioKmeans(vectors);
    const b = runPortfolioKmeans(vectors);
    expect(a?.clusters).toEqual(b?.clusters);
  });
});
