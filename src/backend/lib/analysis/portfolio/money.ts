export function parseItemMoney(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (Number.isInteger(value)) {
    return value / 100;
  }
  return value;
}

export function resolveLineRevenue(
  sellingPrice: unknown,
  price: unknown,
  quantity: number,
): { revenue: number | null; missingPrice: boolean } {
  const unit =
    parseItemMoney(sellingPrice) ?? parseItemMoney(price) ?? null;
  if (unit === null || quantity <= 0) {
    return { revenue: null, missingPrice: true };
  }
  return { revenue: unit * quantity, missingPrice: false };
}

export function isOrderCanceled(status: string | null | undefined): boolean {
  if (!status) {
    return false;
  }
  const normalized = status.toLowerCase();
  return normalized === "canceled" || normalized === "cancelled";
}
