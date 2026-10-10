import type { Ga4ItemRow } from "@/backend/lib/analysis/portfolio/types";
import type { FetchFn } from "@/backend/lib/google/google-auth";
import { clampGoogleEndDate, toGoogleApiDate } from "@/backend/lib/google/period";

import { runGa4Report } from "@/backend/lib/google/ga4-collector";

function metricAt(
  row: { metricValues?: Array<{ value?: string }> },
  index: number,
): number {
  return Number(row.metricValues?.[index]?.value ?? 0);
}

export type CollectGa4ItemsInput = {
  accessToken: string;
  propertyId: string;
  period: { start: string; end: string };
  fetchFn?: FetchFn;
};

export async function collectGa4Items(
  input: CollectGa4ItemsInput,
): Promise<Ga4ItemRow[]> {
  const fetchFn = input.fetchFn ?? fetch;
  const startDate = toGoogleApiDate(input.period.start);
  const endDate = clampGoogleEndDate(input.period.end);
  const dateRange = {
    startDate: startDate <= endDate ? startDate : endDate,
    endDate,
  };

  const report = await runGa4Report(
    input.accessToken,
    input.propertyId,
    {
      dateRanges: [dateRange],
      currencyCode: "BRL",
      dimensions: [{ name: "itemId" }, { name: "itemName" }],
      metrics: [
        { name: "itemsViewed" },
        { name: "itemsAddedToCart" },
        { name: "itemsPurchased" },
        { name: "itemRevenue" },
      ],
      orderBys: [{ metric: { metricName: "itemRevenue" }, desc: true }],
      limit: 100,
    },
    fetchFn,
  );

  return (report.rows ?? []).map((row) => ({
    itemId: row.dimensionValues?.[0]?.value ?? "",
    itemName: row.dimensionValues?.[1]?.value ?? "",
    itemsViewed: metricAt(row, 0),
    itemsAddedToCart: metricAt(row, 1),
    itemsPurchased: metricAt(row, 2),
    itemRevenue: metricAt(row, 3),
  }));
}
