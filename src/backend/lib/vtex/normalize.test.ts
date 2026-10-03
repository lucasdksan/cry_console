import { describe, expect, it } from "vitest";

import {
  computeVtexMetrics,
  mergeVtexCollectorOutputs,
} from "@/backend/lib/vtex/normalize";

describe("mergeVtexCollectorOutputs", () => {
  it("mescla partials como normalize.py do iliada", () => {
    const merged = mergeVtexCollectorOutputs(
      [
        { orders: [{ orderId: "1", value: 10, items: [] }] },
        { inventory: [{ skuId: "a", quantity: 5 }] },
        { checkout: { storeUrl: "https://loja.example" } },
      ],
      "2026-07-01T00:00:00.000Z",
    );

    expect(merged.orders).toHaveLength(1);
    expect(merged.inventory).toHaveLength(1);
    expect(merged.checkout.storeUrl).toBe("https://loja.example");
    expect(merged.collectedAt).toBe("2026-07-01T00:00:00.000Z");
  });
});

describe("computeVtexMetrics", () => {
  it("exclui pedidos cancelados da receita", () => {
    const metrics = computeVtexMetrics({
      orders: [
        { orderId: "1", value: 100, status: "invoiced", items: [] },
        { orderId: "2", value: 50, status: "canceled", items: [] },
        { orderId: "3", value: 30, status: "cancelled", items: [] },
      ],
      inventory: [],
      pricing: [],
      categories: [],
      shipments: [],
      checkout: {},
      collectedAt: "2026-07-01T00:00:00.000Z",
    });

    expect(metrics.order_count).toBe(3);
    expect(metrics.revenue).toBe(100);
    expect(metrics.canceled).toBe(2);
  });
});
