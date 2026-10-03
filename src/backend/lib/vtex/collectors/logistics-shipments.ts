import type { VtexClient } from "@/backend/lib/vtex/client";
import type { VtexCollectorPartial } from "@/backend/lib/vtex/normalize";
export async function collectLogisticsShipments(
  client: VtexClient,
): Promise<VtexCollectorPartial> {
  const shipments = await client.getPaginated(
    "/api/logistics/pvt/shipments",
    { page: 1, per_page: 50 },
    { maxPages: 5, perPage: 50 },
  );
  return { shipments };
}
