import { afterEach, describe, expect, it, vi } from "vitest";

import { VtexApiError } from "@/backend/lib/vtex/errors";
import { VtexClient } from "@/backend/lib/vtex/client";
import { collectOrders } from "@/backend/lib/vtex/collectors/orders";

describe("collectOrders", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna partial quando OMS falha após páginas coletadas", async () => {
    const client = new VtexClient({
      account: "acct",
      environment: "vtexcommercestable",
      appKey: "key",
      appToken: "token",
    });

    let call = 0;
    vi.spyOn(client, "get").mockImplementation(async () => {
      call += 1;
      if (call === 1) {
        return {
          list: Array.from({ length: 100 }, (_, i) => ({
            orderId: String(i),
            value: 100,
            items: [],
          })),
        };
      }
      throw new VtexApiError("400 Bad Request", 400, "/api/oms/pvt/orders");
    });

    const { partial, meta } = await collectOrders(client, {
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      siteUrl: "https://loja.example",
    });

    expect(meta.status).toBe("partial");
    expect(partial.orders).toHaveLength(100);
  });
});
