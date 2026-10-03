import type { VtexClient } from "@/backend/lib/vtex/client";
import type { VtexCollectorPartial } from "@/backend/lib/vtex/normalize";
export async function collectCategoryTree(
  client: VtexClient,
): Promise<VtexCollectorPartial> {
  const categories =
    (await client.get("/api/catalog_system/pub/category/tree/3")) ?? [];
  return {
    categories: Array.isArray(categories) ? categories : [],
  };
}
