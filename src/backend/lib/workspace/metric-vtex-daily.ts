import { spCalendarYmd } from "@/backend/lib/workspace/period";
import type { VtexOrder } from "@/backend/lib/vtex/schemas";

export type VtexDayTotals = {
  revenue: number;
  orders: number;
};

export function aggregateVtexOrdersByDay(
  orders: VtexOrder[],
): Map<string, VtexDayTotals> {
  const map = new Map<string, VtexDayTotals>();

  for (const order of orders) {
    if (!order.creationDate) {
      continue;
    }
    const ymd = spCalendarYmd(new Date(order.creationDate));
    const entry = map.get(ymd) ?? { revenue: 0, orders: 0 };
    entry.revenue += order.value ?? 0;
    entry.orders += 1;
    map.set(ymd, entry);
  }

  return map;
}
