import type { VtexCollectContext } from "@/backend/lib/vtex/collectors/context";
import type { VtexCollectorPartial } from "@/backend/lib/vtex/normalize";

export async function collectCheckout(
  ctx: VtexCollectContext,
): Promise<VtexCollectorPartial> {
  return {
    checkout: {
      storeUrl: ctx.siteUrl,
      note: "Inspeção de checkout via browser MCP recomendada",
    },
  };
}
