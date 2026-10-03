import type { VtexNormalized, VtexSampling } from "@/backend/lib/vtex/schemas";

export type VtexCollectorPartial = Partial<
  Omit<VtexNormalized, "collectedAt" | "sampling">
> & {
  sampling?: VtexSampling;
};

const EMPTY_CHECKOUT: VtexNormalized["checkout"] = {};

export function mergeVtexCollectorOutputs(
  parts: VtexCollectorPartial[],
  collectedAt: string,
): VtexNormalized {
  const merged: VtexNormalized = {
    orders: [],
    inventory: [],
    pricing: [],
    categories: [],
    shipments: [],
    checkout: { ...EMPTY_CHECKOUT },
    collectedAt,
  };

  let sampling: VtexSampling | undefined;

  for (const part of parts) {
    if (part.orders?.length) {
      merged.orders = part.orders;
    }
    if (part.inventory?.length) {
      merged.inventory = part.inventory;
    }
    if (part.pricing?.length) {
      merged.pricing = part.pricing;
    }
    if (part.categories?.length) {
      merged.categories = part.categories;
    }
    if (part.shipments?.length) {
      merged.shipments = part.shipments;
    }
    if (part.checkout && Object.keys(part.checkout).length > 0) {
      merged.checkout = { ...merged.checkout, ...part.checkout };
    }
    if (part.sampling) {
      sampling = part.sampling;
    }
  }

  if (sampling) {
    merged.sampling = sampling;
  }

  return merged;
}

export function computeVtexMetrics(normalized: VtexNormalized): {
  order_count: number;
  revenue: number;
  canceled: number;
} {
  const orders = normalized.orders;
  const canceled = orders.filter((o) =>
    ["canceled", "cancelled"].includes(String(o.status ?? "").toLowerCase()),
  ).length;

  const revenue = orders
    .filter(
      (o) =>
        !["canceled", "cancelled"].includes(String(o.status ?? "").toLowerCase()),
    )
    .reduce((sum, o) => sum + (o.value ?? 0), 0);

  return {
    order_count: orders.length,
    revenue,
    canceled,
  };
}
