import { VtexApiError } from "@/backend/lib/vtex/errors";
import type { VtexClient } from "@/backend/lib/vtex/client";
import type { VtexCollectorPartial } from "@/backend/lib/vtex/normalize";
import type { VtexPricingRow } from "@/backend/lib/vtex/schemas";
function collectSkuSample(skuData: unknown, perProduct: number): string[] {
  const ids: string[] = [];
  if (!skuData || typeof skuData !== "object" || Array.isArray(skuData)) {
    return ids;
  }
  for (const skus of Object.values(skuData as Record<string, unknown>)) {
    if (!Array.isArray(skus)) {
      continue;
    }
    for (const sku of skus.slice(0, perProduct)) {
      ids.push(String(sku));
    }
  }
  return ids;
}

export async function collectPricing(
  client: VtexClient,
): Promise<VtexCollectorPartial> {
  const skuData =
    (await client.get("/api/catalog_system/pvt/products/GetProductAndSkuIds", {
      _from: 1,
      _to: 100,
    })) ?? {};

  const skuIds = collectSkuSample(skuData, 3);
  const pricing: VtexPricingRow[] = [];

  for (const skuId of skuIds) {
    try {
      const priceData = await client.get(`/api/pricing/prices/${skuId}`);
      if (priceData && typeof priceData === "object") {
        const record = priceData as Record<string, unknown>;
        const price = record.basePrice ?? record.listPrice;
        pricing.push({
          skuId,
          price: price !== undefined && price !== null ? Number(price) : null,
        });
      }
    } catch (error) {
      if (error instanceof VtexApiError) {
        pricing.push({ skuId, price: null });
        continue;
      }
      throw error;
    }
  }

  return { pricing };
}
