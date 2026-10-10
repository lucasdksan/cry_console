import { normalizePathname } from "@/backend/lib/analysis/portfolio/paths";
import type {
  Ga4ItemRow,
  GscPageRow,
  PortfolioSkuCrossGa4,
  PortfolioSkuCrossGsc,
} from "@/backend/lib/analysis/portfolio/types";
import type { AbcTaggedRow } from "@/backend/lib/analysis/portfolio/abc";

function normalizeGa4ItemId(itemId: string): string | null {
  const trimmed = itemId.trim();
  if (!trimmed || trimmed.toLowerCase() === "(not set)") {
    return null;
  }
  return trimmed;
}

export function buildGa4Index(items: Ga4ItemRow[]): Map<string, Ga4ItemRow> {
  const byId = new Map<string, Ga4ItemRow>();
  for (const item of items) {
    const id = normalizeGa4ItemId(item.itemId);
    if (!id || byId.has(id)) {
      continue;
    }
    byId.set(id, item);
  }
  return byId;
}

export function matchGa4ForSku(
  row: AbcTaggedRow,
  index: Map<string, Ga4ItemRow>,
): PortfolioSkuCrossGa4 | null {
  const sku = row.skuId?.trim();
  const product = row.productId?.trim();
  let match: Ga4ItemRow | undefined;
  if (sku) {
    match = index.get(sku);
  }
  if (!match && product) {
    match = index.get(product);
  }
  if (!match) {
    return null;
  }

  const views = match.itemsViewed;
  const addToCart = match.itemsAddedToCart;
  const purchased = match.itemsPurchased;
  return {
    items_viewed: views,
    items_added_to_cart: addToCart,
    items_purchased: purchased,
    add_to_cart_rate_pct: views > 0 ? (addToCart / views) * 100 : null,
    purchase_rate_pct: views > 0 ? (purchased / views) * 100 : null,
  };
}

export function countGa4Matches(
  rows: AbcTaggedRow[],
  index: Map<string, Ga4ItemRow>,
): number {
  let count = 0;
  for (const row of rows) {
    if (matchGa4ForSku(row, index)) {
      count += 1;
    }
  }
  return count;
}

export function buildGscPathIndex(
  pages: GscPageRow[],
): Map<string, GscPageRow[]> {
  const map = new Map<string, GscPageRow[]>();
  for (const page of pages) {
    const path = normalizePathname(page.page);
    if (!path) {
      continue;
    }
    const list = map.get(path) ?? [];
    list.push(page);
    map.set(path, list);
  }
  return map;
}

export function matchGscForSku(
  row: AbcTaggedRow,
  index: Map<string, GscPageRow[]>,
): PortfolioSkuCrossGsc | null {
  if (!row.detailUrl) {
    return null;
  }
  const path = normalizePathname(row.detailUrl);
  if (!path) {
    return null;
  }
  const matches = index.get(path);
  if (!matches?.length) {
    return null;
  }

  let clicks = 0;
  let impressions = 0;
  let bestPosition = Infinity;
  for (const m of matches) {
    clicks += m.clicks;
    impressions += m.impressions;
    bestPosition = Math.min(bestPosition, m.position);
  }

  return {
    clicks,
    impressions,
    position: bestPosition === Infinity ? 0 : bestPosition,
  };
}
