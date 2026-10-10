import type { GscPageRow } from "@/backend/lib/analysis/portfolio/types";
import type { FetchFn } from "@/backend/lib/google/google-auth";
import { clampGoogleEndDate, toGoogleApiDate } from "@/backend/lib/google/period";
import {
  pickGscSiteUrl,
  type GscSiteEntry,
} from "@/backend/lib/google/gsc-site-url";

type GscQueryResponse = {
  rows?: Array<{
    keys?: string[];
    clicks?: number;
    impressions?: number;
    position?: number;
  }>;
};

async function listSearchConsoleSites(
  accessToken: string,
  fetchFn: FetchFn,
): Promise<GscSiteEntry[]> {
  const response = await fetchFn(
    "https://www.googleapis.com/webmasters/v3/sites",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Search Console API falhou (${response.status}): ${text.slice(0, 240)}`,
    );
  }

  const json = (await response.json()) as { siteEntry?: GscSiteEntry[] };
  return json.siteEntry ?? [];
}

async function querySearchAnalytics(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>,
  fetchFn: FetchFn,
): Promise<GscQueryResponse> {
  const encodedSite = encodeURIComponent(siteUrl);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`;
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
      `Search Console API falhou (${response.status}): ${text.slice(0, 240)}`,
    );
  }

  return (await response.json()) as GscQueryResponse;
}

export type CollectGscPagesInput = {
  accessToken: string;
  siteUrl: string;
  period: { start: string; end: string };
  fetchFn?: FetchFn;
};

export async function collectGscPages(
  input: CollectGscPagesInput,
): Promise<GscPageRow[]> {
  const fetchFn = input.fetchFn ?? fetch;
  const startDateRaw = toGoogleApiDate(input.period.start);
  const endDate = clampGoogleEndDate(input.period.end);
  const startDate = startDateRaw <= endDate ? startDateRaw : endDate;
  const sites = await listSearchConsoleSites(input.accessToken, fetchFn);
  const siteUrl = pickGscSiteUrl(input.siteUrl, sites);
  if (!siteUrl) {
    throw new Error(
      `A service account não tem permissão no Search Console para ${input.siteUrl}.`,
    );
  }

  const response = await querySearchAnalytics(
    input.accessToken,
    siteUrl,
    {
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 250,
    },
    fetchFn,
  );

  return (response.rows ?? []).map((row) => ({
    page: row.keys?.[0] ?? "",
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    position: Number(row.position ?? 0),
  }));
}
