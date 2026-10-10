import { parseOrderValue } from "@/backend/lib/vtex/parse-order";

import {
  isOrderCanceled,
  resolveLineRevenue,
} from "@/backend/lib/analysis/portfolio/money";
import { PORTFOLIO_UNKNOWN_KEY } from "@/backend/lib/analysis/portfolio/types";

export type SkuAggregateRow = {
  key: string;
  skuId: string | null;
  productId: string | null;
  name: string;
  detailUrl: string | null;
  revenue: number;
  quantity: number;
  orderIds: Set<string>;
  canceledOrderIds: Set<string>;
};

export type PortfolioAccumulatorSnapshot = {
  populationOrders: number;
  cappedAtMax: boolean;
  rows: Map<string, SkuAggregateRow>;
  seenOrderIds: Set<string>;
  revenueLineTotal: number;
  revenueOrderTotal: number;
  missingPriceLines: number;
  unknownLineCount: number;
  ordersWithoutDetailUrl: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value);
}

export function resolvePortfolioKey(input: {
  skuId: string | null;
  productId: string | null;
  name: string | null;
}): string | null {
  if (input.skuId) {
    return `sku:${input.skuId}`;
  }
  if (input.productId) {
    return `product:${input.productId}`;
  }
  if (input.name?.trim()) {
    return `name:${input.name.trim().toLowerCase()}`;
  }
  return null;
}

export function createPortfolioAccumulator(maxOrders: number): {
  feedPage: (rawOrders: Record<string, unknown>[]) => void;
  snapshot: () => PortfolioAccumulatorSnapshot;
} {
  const rows = new Map<string, SkuAggregateRow>();
  const seenOrderIds = new Set<string>();
  let populationOrders = 0;
  let cappedAtMax = false;
  let revenueLineTotal = 0;
  let revenueOrderTotal = 0;
  let missingPriceLines = 0;
  let unknownLineCount = 0;
  let ordersWithoutDetailUrl = 0;

  const feedPage = (rawOrders: Record<string, unknown>[]) => {
    for (const raw of rawOrders) {
      if (populationOrders >= maxOrders) {
        cappedAtMax = true;
        break;
      }
      const orderId =
        stringOrNull(raw.orderId) ?? stringOrNull(raw.order_id) ?? null;

      if (orderId && seenOrderIds.has(orderId)) {
        continue;
      }
      if (orderId) {
        seenOrderIds.add(orderId);
      }

      populationOrders += 1;

      const status = stringOrNull(raw.status);
      const canceled = isOrderCanceled(status);
      const orderValue = parseOrderValue(raw);

      if (!canceled) {
        revenueOrderTotal += orderValue;
      }

      const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
      let orderHadDetailUrl = false;

      for (const itemRaw of itemsRaw) {
        const item = asRecord(itemRaw);
        const skuId =
          stringOrNull(item.id) ?? stringOrNull(item.sellerSku) ?? null;
        const productId = stringOrNull(item.productId) ?? null;
        const name =
          stringOrNull(item.name) ??
          stringOrNull(item.description) ??
          "";
        const detailUrl =
          stringOrNull(item.detailUrl) ??
          stringOrNull(item.productUrl) ??
          null;
        if (detailUrl) {
          orderHadDetailUrl = true;
        }

        const quantity = Math.max(0, Number(item.quantity ?? 1));
        const key = resolvePortfolioKey({ skuId, productId, name });

        if (!key) {
          unknownLineCount += 1;
          continue;
        }

        const { revenue, missingPrice } = resolveLineRevenue(
          item.sellingPrice,
          item.price,
          quantity,
        );
        if (missingPrice) {
          missingPriceLines += 1;
        }

        let row = rows.get(key);
        if (!row) {
          row = {
            key,
            skuId,
            productId,
            name: name || skuId || productId || key,
            detailUrl,
            revenue: 0,
            quantity: 0,
            orderIds: new Set(),
            canceledOrderIds: new Set(),
          };
          rows.set(key, row);
        } else if (!row.detailUrl && detailUrl) {
          row.detailUrl = detailUrl;
        }

        if (orderId) {
          if (canceled) {
            row.canceledOrderIds.add(orderId);
          } else {
            row.orderIds.add(orderId);
          }
        }

        if (!canceled) {
          if (revenue !== null) {
            row.revenue += revenue;
            revenueLineTotal += revenue;
          }
          row.quantity += quantity;
        }
      }

      if (itemsRaw.length > 0 && !orderHadDetailUrl) {
        ordersWithoutDetailUrl += 1;
      }
    }
  };

  const snapshot = (): PortfolioAccumulatorSnapshot => ({
    populationOrders,
    cappedAtMax,
    rows,
    seenOrderIds,
    revenueLineTotal,
    revenueOrderTotal,
    missingPriceLines,
    unknownLineCount,
    ordersWithoutDetailUrl,
  });

  return { feedPage, snapshot };
}

export function rowsFromSnapshot(
  snapshot: PortfolioAccumulatorSnapshot,
): SkuAggregateRow[] {
  return [...snapshot.rows.values()].filter(
    (row) => row.key !== PORTFOLIO_UNKNOWN_KEY,
  );
}
