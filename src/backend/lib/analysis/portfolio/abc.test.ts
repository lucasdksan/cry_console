import { describe, expect, it } from "vitest";

import { assignAbc } from "@/backend/lib/analysis/portfolio/abc";
import type { SkuAggregateRow } from "@/backend/lib/analysis/portfolio/aggregate";

function row(key: string, revenue: number): SkuAggregateRow {
  return {
    key,
    skuId: key,
    productId: null,
    name: key,
    detailUrl: null,
    revenue,
    quantity: 1,
    orderIds: new Set(["1"]),
    canceledOrderIds: new Set(),
  };
}

describe("portfolio abc", () => {
  it("classifica A/B/C na curva 80/95", () => {
    const { tagged, slices } = assignAbc([
      row("a", 800),
      row("b", 150),
      row("c", 50),
    ]);
    const byKey = Object.fromEntries(tagged.map((r) => [r.key, r.abcClass]));
    expect(byKey.a).toBe("A");
    expect(slices.find((s) => s.class === "A")?.revenueSharePct).toBeCloseTo(
      80,
      0,
    );
  });
});
