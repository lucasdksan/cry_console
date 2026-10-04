import type { FetchFn } from "@/backend/lib/google/google-auth";
import { clampGoogleEndDate, toGoogleApiDate } from "@/backend/lib/google/period";
import {
  pickGscSiteUrl,
  type GscSiteEntry,
} from "@/backend/lib/google/gsc-site-url";
import {
  adaptSearchConsole,
  type SearchConsoleNormalized,
} from "@/backend/lib/normalized-adapters";

type GscQueryResponse = {
  rows?: Array<{
    keys?: string[];
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
  }>;
  responseAggregationType?: string;
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

function aggregateOverview(rows: GscQueryResponse["rows"]): {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
} {
  const list = rows ?? [];
  const clicks = list.reduce((sum, row) => sum + Number(row.clicks ?? 0), 0);
  const impressions = list.reduce(
    (sum, row) => sum + Number(row.impressions ?? 0),
    0,
  );
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const position =
    list.length > 0
      ? list.reduce((sum, row) => sum + Number(row.position ?? 0), 0) /
        list.length
      : 0;
  return { clicks, impressions, ctr, position };
}

export type CollectGscInput = {
  accessToken: string;
  siteUrl: string;
  period: { start: string; end: string };
  brandKeyword?: string;
  fetchFn?: FetchFn;
};

export async function collectSearchConsole(
  input: CollectGscInput,
): Promise<SearchConsoleNormalized | null> {
  const fetchFn = input.fetchFn ?? fetch;
  const startDateRaw = toGoogleApiDate(input.period.start);
  const endDate = clampGoogleEndDate(input.period.end);
  const startDate = startDateRaw <= endDate ? startDateRaw : endDate;
  const sites = await listSearchConsoleSites(input.accessToken, fetchFn);
  const siteUrl = pickGscSiteUrl(input.siteUrl, sites);
  if (!siteUrl) {
    throw new Error(
      `A service account não tem permissão no Search Console para ${input.siteUrl}. Adicione o e-mail da service account como usuário da propriedade (URL com prefixo ou domínio).`,
    );
  }

  const [overviewResponse, queryResponse] = await Promise.all([
    querySearchAnalytics(
      input.accessToken,
      siteUrl,
      { startDate, endDate, rowLimit: 1 },
      fetchFn,
    ),
    querySearchAnalytics(
      input.accessToken,
      siteUrl,
      {
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 250,
      },
      fetchFn,
    ),
  ]);

  const overviewRows = overviewResponse.rows ?? [];
  const overview =
    overviewRows.length > 0
      ? {
          clicks: Number(overviewRows[0]?.clicks ?? 0),
          impressions: Number(overviewRows[0]?.impressions ?? 0),
          ctr: Number(overviewRows[0]?.ctr ?? 0),
          position: Number(overviewRows[0]?.position ?? 0),
        }
      : aggregateOverview(queryResponse.rows);

  const raw = {
    overview,
    rows: queryResponse.rows ?? [],
    brandKeyword: input.brandKeyword,
  };

  return adaptSearchConsole(raw);
}
