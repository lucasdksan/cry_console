import { VtexApiError } from "@/backend/lib/vtex/errors";
import type { VtexClient } from "@/backend/lib/vtex/client";
import type { VtexCollectorPartial } from "@/backend/lib/vtex/normalize";
import type { VtexInventoryRow } from "@/backend/lib/vtex/schemas";
function collectSkuIds(skuData: unknown): string[] {
  const skuIds: string[] = [];
  if (!skuData || typeof skuData !== "object" || Array.isArray(skuData)) {
    return skuIds;
  }
  for (const skus of Object.values(skuData as Record<string, unknown>)) {
    if (!Array.isArray(skus)) {
      continue;
    }
    for (const sku of skus) {
      skuIds.push(String(sku));
    }
  }
  return skuIds;
}

export async function collectInventory(
  client: VtexClient,
): Promise<VtexCollectorPartial> {
  const skuData =
    (await client.get("/api/catalog_system/pvt/products/GetProductAndSkuIds", {
      _from: 1,
      _to: 250,
    })) ?? {};

  const skuIds = collectSkuIds(skuData).slice(0, 100);
  const inventory: VtexInventoryRow[] = [];

  for (const skuId of skuIds) {
    try {
      const item = await client.get(
        `/api/logistics/pvt/inventory/skus/${skuId}`,
      );
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const balance = record.balance ?? record.totalQuantity ?? 0;
        inventory.push({ skuId, quantity: Number(balance) });
      }
    } catch (error) {
      if (error instanceof VtexApiError) {
        inventory.push({ skuId, quantity: null, error: "unavailable" });
        continue;
      }
      throw error;
    }
  }

  return { inventory };
}
