import { VtexClient, type VtexClientConfig } from "@/backend/lib/vtex/client";
import { collectCategoryTree } from "@/backend/lib/vtex/collectors/category-tree";
import { collectCheckout } from "@/backend/lib/vtex/collectors/checkout";
import type {
  OrdersCollectOptions,
  VtexCollectContext,
} from "@/backend/lib/vtex/collectors/context";
import { collectInventory } from "@/backend/lib/vtex/collectors/inventory";
import { collectLogisticsShipments } from "@/backend/lib/vtex/collectors/logistics-shipments";
import { collectOrders } from "@/backend/lib/vtex/collectors/orders";
import { collectPricing } from "@/backend/lib/vtex/collectors/pricing";
import { sanitizeCollectorError } from "@/backend/lib/vtex/gap-sanitize";
import {
  computeVtexMetrics,
  mergeVtexCollectorOutputs,
  type VtexCollectorPartial,
} from "@/backend/lib/vtex/normalize";
import {
  defaultCollectorsForInsights,
  type VtexCollector,
} from "@/backend/lib/vtex/registry";
import type {
  VtexCollectResult,
  VtexCollectorResult,
  VtexDataGap,
  VtexPeriod,
} from "@/backend/lib/vtex/schemas";

export type RunVtexCollectOptions = {
  config: VtexClientConfig;
  siteUrl: string;
  period: VtexPeriod;
  collectors?: VtexCollector[];
  ordersOptions?: OrdersCollectOptions;
};

async function runSingleCollector(
  client: VtexClient,
  ctx: VtexCollectContext,
  collector: VtexCollector,
): Promise<{ partial: VtexCollectorPartial; result: VtexCollectorResult }> {
  try {
    switch (collector) {
      case "orders": {
        const { partial, meta } = await collectOrders(client, ctx);
        return {
          partial,
          result: {
            collector,
            status: meta.status,
            error: meta.error
              ? sanitizeCollectorError(meta.error, collector)
              : undefined,
          },
        };
      }
      case "category_tree": {
        const partial = await collectCategoryTree(client);
        return { partial, result: { collector, status: "ok" } };
      }
      case "inventory": {
        const partial = await collectInventory(client);
        return { partial, result: { collector, status: "ok" } };
      }
      case "checkout": {
        const partial = await collectCheckout(ctx);
        return { partial, result: { collector, status: "ok" } };
      }
      case "logistics_shipments": {
        const partial = await collectLogisticsShipments(client);
        return { partial, result: { collector, status: "ok" } };
      }
      case "pricing": {
        const partial = await collectPricing(client);
        return { partial, result: { collector, status: "ok" } };
      }
      default: {
        const _exhaustive: never = collector;
        throw new Error(`Coletor desconhecido: ${_exhaustive}`);
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido na coleta VTEX";
    return {
      partial: {},
      result: {
        collector,
        status: "failed",
        error: sanitizeCollectorError(message, collector),
      },
    };
  }
}

export async function runVtexCollect(
  options: RunVtexCollectOptions,
): Promise<VtexCollectResult> {
  const collectors = options.collectors ?? defaultCollectorsForInsights();
  const client = new VtexClient(options.config);
  const ctx: VtexCollectContext = {
    dateFrom: options.period.start,
    dateTo: options.period.end,
    siteUrl: options.siteUrl,
    ordersOptions: options.ordersOptions,
  };

  const settled = await Promise.all(
    collectors.map((collector) => runSingleCollector(client, ctx, collector)),
  );

  const collectorResults = settled.map((item) => item.result);
  const partials = settled.map((item) => item.partial);
  const collectedAt = new Date().toISOString();
  const normalized = mergeVtexCollectorOutputs(partials, collectedAt);
  const metrics = computeVtexMetrics(normalized);

  const dataGaps: VtexDataGap[] = collectorResults
    .filter((r) => r.status === "failed" || r.status === "partial")
    .map((r) => ({
      source: "vtex" as const,
      reason: r.error ?? `Coletor ${r.collector} incompleto`,
      impact: "Dados VTEX parciais",
    }));

  return {
    normalized,
    collectorResults,
    dataGaps,
    metrics,
  };
}
