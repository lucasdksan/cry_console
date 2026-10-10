import { describe, expect, it } from "vitest";

import {
  isOrderCanceled,
  parseItemMoney,
  resolveLineRevenue,
} from "@/backend/lib/analysis/portfolio/money";

describe("portfolio money", () => {
  it("converte centavos inteiros", () => {
    expect(parseItemMoney(1990)).toBe(19.9);
    expect(parseItemMoney(19.9)).toBe(19.9);
  });

  it("usa sellingPrice antes de price", () => {
    expect(resolveLineRevenue(1000, 2000, 2)).toEqual({
      revenue: 20,
      missingPrice: false,
    });
  });

  it("marca linha sem preço", () => {
    expect(resolveLineRevenue(undefined, undefined, 1)).toEqual({
      revenue: null,
      missingPrice: true,
    });
  });

  it("detecta cancelados", () => {
    expect(isOrderCanceled("canceled")).toBe(true);
    expect(isOrderCanceled("cancelled")).toBe(true);
    expect(isOrderCanceled("invoiced")).toBe(false);
  });
});
