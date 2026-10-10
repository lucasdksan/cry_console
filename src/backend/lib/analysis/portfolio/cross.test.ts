import { describe, expect, it } from "vitest";

import { assignAbc } from "@/backend/lib/analysis/portfolio/abc";
import type { SkuAggregateRow } from "@/backend/lib/analysis/portfolio/aggregate";
import {
  buildGa4Index,
  buildGscPathIndex,
  matchGa4ForSku,
  matchGscForSku,
} from "@/backend/lib/analysis/portfolio/cross";
import { normalizePathname } from "@/backend/lib/analysis/portfolio/paths";

function taggedRow(partial: Partial<SkuAggregateRow> & { key: string }): ReturnType<typeof assignAbc>["tagged"][number] {
  const base: SkuAggregateRow = {
    skuId: partial.skuId ?? partial.key,
    productId: partial.productId ?? null,
    name: partial.name ?? partial.key,
    detailUrl: partial.detailUrl ?? null,
    revenue: partial.revenue ?? 100,
    quantity: partial.quantity ?? 1,
    orderIds: partial.orderIds ?? new Set(["1"]),
    canceledOrderIds: partial.canceledOrderIds ?? new Set(),
    key: partial.key,
  };
  return assignAbc([base]).tagged[0]!;
}

describe("portfolio cross", () => {
  it("GA4 prefere skuId sobre productId", () => {
    const index = buildGa4Index([
      {
        itemId: "sku-1",
        itemName: "A",
        itemsViewed: 10,
        itemsAddedToCart: 2,
        itemsPurchased: 1,
        itemRevenue: 50,
      },
      {
        itemId: "prod-9",
        itemName: "B",
        itemsViewed: 5,
        itemsAddedToCart: 0,
        itemsPurchased: 0,
        itemRevenue: 0,
      },
    ]);
    const bySku = taggedRow({ key: "sku:sku-1", skuId: "sku-1", productId: "prod-9" });
    expect(matchGa4ForSku(bySku, index)?.items_viewed).toBe(10);
    expect(index.has("(not set)")).toBe(false);
  });

  it("GSC normaliza pathname", () => {
    expect(normalizePathname("https://loja.com/p/x/?utm=1")).toBe("/p/x");
    const index = buildGscPathIndex([
      {
        page: "https://loja.com/produto/p",
        clicks: 3,
        impressions: 100,
        position: 4.2,
      },
    ]);
    const row = taggedRow({
      key: "sku:1",
      detailUrl: "/produto/p/",
    });
    expect(matchGscForSku(row, index)?.clicks).toBe(3);
    expect(matchGscForSku(taggedRow({ key: "x", detailUrl: null }), index)).toBeNull();
  });
});
