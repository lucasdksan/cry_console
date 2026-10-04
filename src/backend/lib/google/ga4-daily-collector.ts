import type { FetchFn } from "@/backend/lib/google/google-auth";
import { clampGoogleEndDate, toGoogleApiDate } from "@/backend/lib/google/period";
import { runGa4Report } from "@/backend/lib/google/ga4-collector";

export type Ga4DailyMetricRow = {
  dateYmd: string;
  sessions: number;
  purchases: number;
};

function ga4DateToYmd(value: string): string {
  if (value.length === 8 && !value.includes("-")) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return toGoogleApiDate(value);
}

export type CollectGa4DailyInput = {
  accessToken: string;
  propertyId: string;
  period: { start: string; end: string };
  fetchFn?: FetchFn;
};

export async function collectGa4DailyMetrics(
  input: CollectGa4DailyInput,
): Promise<Ga4DailyMetricRow[]> {
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
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }, { name: "ecommercePurchases" }],
    },
    fetchFn,
  );

  return (report.rows ?? []).map((row) => {
    const rawDate = row.dimensionValues?.[0]?.value ?? "";
    const sessions = Number(row.metricValues?.[0]?.value ?? 0);
    const purchases = Number(row.metricValues?.[1]?.value ?? 0);
    return {
      dateYmd: ga4DateToYmd(rawDate),
      sessions,
      purchases,
    };
  });
}
