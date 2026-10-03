import type { FetchFn } from "@/backend/lib/google/google-auth";
import { toGoogleApiDate } from "@/backend/lib/google/period";
import { adaptAnalytics } from "@/backend/lib/normalized-adapters";
import type { AnalyticsNormalized } from "@/backend/lib/normalized-adapters";

type Ga4MetricValue = { value?: string };
type Ga4Row = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Ga4MetricValue[];
};

type Ga4RunReportResponse = {
  rows?: Ga4Row[];
};

function metricAt(row: Ga4Row, index: number): number {
  return Number(row.metricValues?.[index]?.value ?? 0);
}

async function runGa4Report(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>,
  fetchFn: FetchFn,
): Promise<Ga4RunReportResponse> {
  const property = propertyId.replace(/^properties\//, "");
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`;
  const response = await fetchFn(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `GA4 runReport falhou (${response.status}): ${text.slice(0, 240)}`,
    );
  }

  return (await response.json()) as Ga4RunReportResponse;
}

export type CollectGa4Input = {
  accessToken: string;
  propertyId: string;
  period: { start: string; end: string };
  fetchFn?: FetchFn;
};

export async function collectGa4Analytics(
  input: CollectGa4Input,
): Promise<AnalyticsNormalized | null> {
  const fetchFn = input.fetchFn ?? fetch;
  const dateRange = {
    startDate: toGoogleApiDate(input.period.start),
    endDate: toGoogleApiDate(input.period.end),
  };

  const [totalsReport, channelReport, deviceReport] = await Promise.all([
    runGa4Report(
      input.accessToken,
      input.propertyId,
      {
        dateRanges: [dateRange],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "ecommercePurchases" },
          { name: "purchaseRevenue" },
          { name: "addToCarts" },
          { name: "checkouts" },
          { name: "itemViewEvents" },
        ],
      },
      fetchFn,
    ),
    runGa4Report(
      input.accessToken,
      input.propertyId,
      {
        dateRanges: [dateRange],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [
          { name: "sessions" },
          { name: "ecommercePurchases" },
          { name: "purchaseRevenue" },
        ],
      },
      fetchFn,
    ),
    runGa4Report(
      input.accessToken,
      input.propertyId,
      {
        dateRanges: [dateRange],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
      },
      fetchFn,
    ),
  ]);

  const totalsRow = totalsReport.rows?.[0];
  const sessions = totalsRow ? metricAt(totalsRow, 0) : 0;
  const activeUsers = totalsRow ? metricAt(totalsRow, 1) : 0;
  const purchases = totalsRow ? metricAt(totalsRow, 2) : 0;
  const purchaseRevenue = totalsRow ? metricAt(totalsRow, 3) : 0;
  const addToCarts = totalsRow ? metricAt(totalsRow, 4) : 0;
  const checkouts = totalsRow ? metricAt(totalsRow, 5) : 0;
  const itemViewEvents = totalsRow ? metricAt(totalsRow, 6) : 0;

  const channels = (channelReport.rows ?? []).map((row) => {
    const channel = row.dimensionValues?.[0]?.value ?? "";
    const chSessions = metricAt(row, 0);
    const chPurchases = metricAt(row, 1);
    const revenue = metricAt(row, 2);
    const conversion_pct =
      chSessions > 0 ? (chPurchases / chSessions) * 100 : 0;
    return { channel, sessions: chSessions, conversion_pct, revenue };
  });

  const deviceRows = deviceReport.rows ?? [];
  const deviceSessionTotal = deviceRows.reduce(
    (sum, row) => sum + metricAt(row, 0),
    0,
  );
  const devices = deviceRows.map((row) => {
    const device = row.dimensionValues?.[0]?.value ?? "";
    const deviceSessions = metricAt(row, 0);
    const share_pct =
      deviceSessionTotal > 0 ? (deviceSessions / deviceSessionTotal) * 100 : 0;
    return { device, sessions: deviceSessions, share_pct };
  });

  const raw = {
    totals: {
      sessions,
      activeUsers,
      ecommercePurchases: purchases,
      purchaseRevenue,
      addToCarts,
      checkouts,
      itemViewEvents,
    },
    funnel: {
      view_item: itemViewEvents,
      add_to_cart: addToCarts,
      begin_checkout: checkouts,
      purchase: purchases,
    },
    channels,
    devices,
  };

  return adaptAnalytics(raw);
}
