import { describe, expect, it } from "vitest";

import {
  extractOrderBatch,
  parseOrder,
  parseOrderValue,
  sampleDeterministic,
} from "@/backend/lib/vtex/parse-order";

describe("parseOrder", () => {
  it("converte centavos VTEX quando value > 1000", () => {
    expect(parseOrderValue({ value: 15000 })).toBe(150);
    expect(parseOrderValue({ value: 999 })).toBe(999);
    expect(parseOrderValue({ totalValue: 8900 })).toBe(89);
  });

  it("mapeia itens e customerId", () => {
    const order = parseOrder({
      orderId: "v123",
      value: 150,
      creationDate: "2026-07-01T10:00:00.000Z",
      status: "invoiced",
      clientProfileData: { userProfileId: "cust-1" },
      items: [{ id: "sku-a", quantity: 2 }, { sellerSku: "sku-b", quantity: 1 }],
    });

    expect(order).toMatchObject({
      orderId: "v123",
      customerId: "cust-1",
      value: 150,
      items: [
        { skuId: "sku-a", quantity: 2 },
        { skuId: "sku-b", quantity: 1 },
      ],
    });
  });

  it("extrai batch OMS em formatos list/items/data", () => {
    expect(extractOrderBatch([{ orderId: "1" }])).toHaveLength(1);
    expect(extractOrderBatch({ list: [{ orderId: "2" }] })).toHaveLength(1);
    expect(extractOrderBatch({ items: [{ orderId: "3" }] })).toHaveLength(1);
  });

  it("amostra determinística com tamanho fixo", () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    const a = sampleDeterministic(input, 10, 42);
    const b = sampleDeterministic(input, 10, 42);
    expect(a).toEqual(b);
    expect(a).toHaveLength(10);
  });
});
