import type { VtexOrder, VtexOrderItem } from "@/backend/lib/vtex/schemas";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function parseOrderValue(raw: Record<string, unknown>): number {
  const value = raw.value ?? raw.totalValue;
  if (typeof value === "number" && value > 1000) {
    return value / 100;
  }
  if (typeof value === "number") {
    return value;
  }
  return 0;
}

export function parseOrder(raw: Record<string, unknown>): VtexOrder {
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items: VtexOrderItem[] = itemsRaw.map((item) => {
    const row = asRecord(item);
    return {
      skuId: String(row.id ?? row.sellerSku ?? ""),
      quantity: Number(row.quantity ?? 1),
    };
  });

  const clientProfile = asRecord(raw.clientProfileData);

  return {
    orderId:
      (raw.orderId as string | undefined) ??
      (raw.order_id as string | undefined) ??
      null,
    customerId:
      (clientProfile.userProfileId as string | undefined) ??
      (raw.customerId as string | undefined) ??
      null,
    value: parseOrderValue(raw),
    creationDate: (raw.creationDate as string | undefined) ?? null,
    status: (raw.status as string | undefined) ?? null,
    items,
  };
}

export function extractOrderBatch(batch: unknown): Record<string, unknown>[] {
  if (Array.isArray(batch)) {
    return batch.map((row) => asRecord(row));
  }
  if (batch !== null && typeof batch === "object") {
    const record = batch as Record<string, unknown>;
    const items = record.list ?? record.items ?? record.data ?? [];
    if (Array.isArray(items)) {
      return items.map((row) => asRecord(row));
    }
  }
  return [];
}

export function toCalendarDate(iso: string): string {
  if (iso.length >= 10 && iso[4] === "-" && iso[7] === "-") {
    return iso.slice(0, 10);
  }
  return new Date(iso).toISOString().slice(0, 10);
}

/** Deterministic sample (seed 42), mirroring iliada orders collector. */
export function sampleDeterministic<T>(items: T[], size: number, seed = 42): T[] {
  if (items.length <= size) {
    return [...items];
  }

  const indices = items.map((_, i) => i);
  let state = seed >>> 0;

  const next = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, size).map((i) => items[i]);
}
