import type { PortfolioAbcClass, PortfolioAbcSlice } from "@/backend/lib/analysis/portfolio/types";
import type { SkuAggregateRow } from "@/backend/lib/analysis/portfolio/aggregate";

export type AbcTaggedRow = SkuAggregateRow & { abcClass: PortfolioAbcClass };

export function assignAbc(rows: SkuAggregateRow[]): {
  tagged: AbcTaggedRow[];
  slices: PortfolioAbcSlice[];
} {
  const eligible = rows.filter((r) => r.revenue > 0);
  const sorted = [...eligible].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = sorted.reduce((sum, r) => sum + r.revenue, 0);

  if (totalRevenue <= 0) {
    return {
      tagged: rows.map((r) => ({ ...r, abcClass: "C" as const })),
      slices: [
        { class: "A", skuCount: 0, revenueSharePct: 0 },
        { class: "B", skuCount: 0, revenueSharePct: 0 },
        { class: "C", skuCount: 0, revenueSharePct: 0 },
      ],
    };
  }

  let cumulative = 0;
  const classByKey = new Map<string, PortfolioAbcClass>();
  for (const row of sorted) {
    cumulative += row.revenue;
    const share = cumulative / totalRevenue;
    let abcClass: PortfolioAbcClass = "C";
    if (share <= 0.8) {
      abcClass = "A";
    } else if (share <= 0.95) {
      abcClass = "B";
    }
    classByKey.set(row.key, abcClass);
  }

  const tagged = rows.map((r) => ({
    ...r,
    abcClass: classByKey.get(r.key) ?? ("C" as const),
  }));

  const slices: PortfolioAbcSlice[] = (["A", "B", "C"] as const).map(
    (abcClass) => {
      const subset = tagged.filter((r) => r.abcClass === abcClass);
      const rev = subset.reduce((s, r) => s + r.revenue, 0);
      return {
        class: abcClass,
        skuCount: subset.length,
        revenueSharePct: (rev / totalRevenue) * 100,
      };
    },
  );

  return { tagged, slices };
}
