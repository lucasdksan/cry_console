import { VtexApiError } from "@/backend/lib/vtex/errors";
import type { VtexClient } from "@/backend/lib/vtex/client";
import type { VtexCollectorPartial } from "@/backend/lib/vtex/normalize";
import type { VtexSampling } from "@/backend/lib/vtex/schemas";
import {
  extractOrderBatch,
  parseOrder,
  sampleDeterministic,
  toCalendarDate,
} from "@/backend/lib/vtex/parse-order";
import type { VtexCollectContext } from "@/backend/lib/vtex/collectors/context";

const MAX_ORDERS = 10_000;
const SAMPLE_SIZE = 2000;

export type OrdersCollectMeta = {
  status: "ok" | "partial";
  error?: string;
};

export async function collectOrders(
  client: VtexClient,
  ctx: VtexCollectContext,
): Promise<{ partial: VtexCollectorPartial; meta: OrdersCollectMeta }> {
  const dateFrom = toCalendarDate(ctx.dateFrom);
  const dateTo = toCalendarDate(ctx.dateTo);

  const rawOrders: Record<string, unknown>[] = [];
  let partialError: string | undefined;

  for (let page = 1; page <= 200 && rawOrders.length < MAX_ORDERS; page += 1) {
    try {
      const batch = await client.get("/api/oms/pvt/orders", {
        f_creationDate: `creationDate:[${dateFrom} TO ${dateTo}]`,
        page,
        per_page: 100,
        orderBy: "creationDate,desc",
      });
      const pageOrders = extractOrderBatch(batch);
      if (pageOrders.length === 0) {
        break;
      }
      rawOrders.push(...pageOrders);
      if (pageOrders.length < 100) {
        break;
      }
    } catch (error) {
      if (rawOrders.length > 0 && error instanceof VtexApiError) {
        partialError = error.message;
        break;
      }
      throw error;
    }
  }

  const population = rawOrders.length;
  let sampling: VtexSampling | undefined;
  let selected = rawOrders;

  if (population > SAMPLE_SIZE) {
    selected = sampleDeterministic(rawOrders, SAMPLE_SIZE, 42);
    sampling = {
      sampleSize: SAMPLE_SIZE,
      totalPopulation: population,
      confidence: "amostra estratificada",
    };
  }

  const orders = selected.map((row) => parseOrder(row));

  return {
    partial: { orders, sampling },
    meta: {
      status: partialError ? "partial" : "ok",
      error: partialError,
    },
  };
}
