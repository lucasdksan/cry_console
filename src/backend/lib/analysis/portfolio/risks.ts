import type { PortfolioRiskEntry } from "@/backend/lib/analysis/portfolio/types";
import type { AbcTaggedRow } from "@/backend/lib/analysis/portfolio/abc";

const MIN_ORDERS_FOR_RISK = 3;

export function cancelRatePct(row: AbcTaggedRow): number {
  const total = row.orderIds.size + row.canceledOrderIds.size;
  if (total === 0) {
    return 0;
  }
  return (row.canceledOrderIds.size / total) * 100;
}

export function detectPortfolioRisks(rows: AbcTaggedRow[]): PortfolioRiskEntry[] {
  const risks: PortfolioRiskEntry[] = [];

  for (const row of rows) {
    const orders = row.orderIds.size + row.canceledOrderIds.size;
    if (orders < MIN_ORDERS_FOR_RISK) {
      continue;
    }
    const rate = cancelRatePct(row);
    if (rate >= 40) {
      risks.push({
        key: row.key,
        name: row.name,
        level: "critico",
        cancelRatePct: rate,
      });
    } else if (rate >= 20) {
      risks.push({
        key: row.key,
        name: row.name,
        level: "alerta",
        cancelRatePct: rate,
      });
    }
  }

  return risks.sort((a, b) => b.cancelRatePct - a.cancelRatePct);
}

export function riskLevelForRow(
  row: AbcTaggedRow,
): "critico" | "alerta" | null {
  const orders = row.orderIds.size + row.canceledOrderIds.size;
  if (orders < MIN_ORDERS_FOR_RISK) {
    return null;
  }
  const rate = cancelRatePct(row);
  if (rate >= 40) {
    return "critico";
  }
  if (rate >= 20) {
    return "alerta";
  }
  return null;
}
