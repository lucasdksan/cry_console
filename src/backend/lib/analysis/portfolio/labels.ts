import type { AbcTaggedRow } from "@/backend/lib/analysis/portfolio/abc";
import { cancelRatePct } from "@/backend/lib/analysis/portfolio/risks";

export function labelCluster(
  rows: AbcTaggedRow[],
  clusterId: number,
  clusters: number[],
  keys: string[],
): string {
  const members = rows.filter((_, i) => clusters[i] === clusterId);
  if (members.length === 0) {
    return "equilibrado";
  }

  const avgCancel =
    members.reduce((s, r) => s + cancelRatePct(r), 0) / members.length;
  const avgQty =
    members.reduce((s, r) => s + r.quantity, 0) / members.length;
  const allQty = rows.map((r) => r.quantity);
  const maxQty = Math.max(...allQty, 1);
  const avgRev =
    members.reduce((s, r) => s + r.revenue, 0) / members.length;
  const allRev = rows.map((r) => r.revenue);
  const maxRev = Math.max(...allRev, 1);

  if (avgCancel >= 25) {
    return "alto cancelamento";
  }
  if (avgQty >= maxQty * 0.6 || avgRev >= maxRev * 0.6) {
    return "alto volume";
  }
  if (avgRev <= maxRev * 0.15 && avgQty <= maxQty * 0.15) {
    return "cauda";
  }

  void keys;
  return "equilibrado";
}
