import { describe, expect, it } from "vitest";

import {
  createPortfolioAccumulator,
  resolvePortfolioKey,
} from "@/backend/lib/analysis/portfolio/aggregate";
import { buildAnalysisPortfolio } from "@/backend/lib/analysis/portfolio/build";

describe("portfolio aggregate", () => {
  it("resolve chave sku > product > name", () => {
    expect(
      resolvePortfolioKey({
        skuId: "1",
        productId: "p",
        name: "X",
      }),
    ).toBe("sku:1");
    expect(
      resolvePortfolioKey({ skuId: null, productId: "p", name: "X" }),
    ).toBe("product:p");
    expect(
      resolvePortfolioKey({ skuId: null, productId: null, name: "Tênis" }),
    ).toBe("name:tênis");
    expect(
      resolvePortfolioKey({ skuId: null, productId: null, name: null }),
    ).toBeNull();
  });

  it("exclui cancelados da receita e deduplica pedido", () => {
    const acc = createPortfolioAccumulator(10_000);
    acc.feedPage([
      {
        orderId: "o1",
        status: "invoiced",
        value: 5000,
        items: [{ id: "sku-a", quantity: 1, sellingPrice: 5000 }],
      },
      {
        orderId: "o1",
        status: "invoiced",
        value: 5000,
        items: [{ id: "sku-a", quantity: 1, sellingPrice: 5000 }],
      },
      {
        orderId: "o2",
        status: "canceled",
        value: 3000,
        items: [{ id: "sku-a", quantity: 1, sellingPrice: 3000 }],
      },
    ]);
    const snap = acc.snapshot();
    const portfolio = buildAnalysisPortfolio({
      snapshot: snap,
      ga4Items: null,
      ga4Ok: false,
      gscPages: null,
      gscOk: false,
    });
    expect(portfolio.topSkus[0]?.revenue).toBe(50);
    expect(portfolio.topSkus[0]?.quantity).toBe(1);
    expect(portfolio.topSkus[0]?.canceledOrderCount).toBe(1);
    expect(portfolio.revenueOrderTotal).toBe(50);
  });
});
