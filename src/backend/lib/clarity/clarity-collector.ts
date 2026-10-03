import { clarityNumOfDays } from "@/backend/lib/google/period";
import {
  adaptClarity,
  type ClarityNormalized,
} from "@/backend/lib/normalized-adapters";

export type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const CLARITY_EXPORT_URL =
  "https://www.clarity.ms/export-api/v1/project-live-insights";

type ClarityMetricRow = Record<string, unknown>;

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseClarityExportPayload(payload: unknown): ClarityNormalized | null {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? ((payload as { data: ClarityMetricRow[] }).data ?? [])
      : [];

  if (!rows.length) {
    return adaptClarity({ sessions: 0, deadClicks: 0, quickBacks: 0 });
  }

  let sessions = 0;
  let deadClicks = 0;
  let quickBacks = 0;
  let rageClicks = 0;
  const devices: Array<{ device: string; sessions: number; share_pct: number }> =
    [];
  const top_rage_pages: Array<{ url: string; rage_clicks: number }> = [];

  for (const row of rows) {
    const metricName = String(
      row.metricName ?? row.MetricName ?? row.name ?? "",
    ).toLowerCase();
    const value = asNumber(row.value ?? row.Value ?? row.count);

    const dimension = String(
      row.dimension ?? row.Dimension ?? row.dimension1 ?? "",
    );
    const hasDimension = Boolean(dimension);

    if (metricName.includes("session")) {
      if (hasDimension) {
        devices.push({ device: dimension, sessions: value, share_pct: 0 });
      } else {
        sessions += value;
      }
    }
    if (metricName.includes("deadclick")) {
      deadClicks += value;
    }
    if (metricName.includes("quickback")) {
      quickBacks += value;
    }
    if (metricName.includes("rageclick")) {
      rageClicks += value;
    }

    const url = String(row.url ?? row.URL ?? row.pageUrl ?? "");
    if (url && metricName.includes("rage")) {
      top_rage_pages.push({ url, rage_clicks: value });
    }
  }

  const deviceTotal = devices.reduce((sum, d) => sum + d.sessions, 0);
  for (const device of devices) {
    device.share_pct =
      deviceTotal > 0 ? (device.sessions / deviceTotal) * 100 : 0;
  }

  if (rageClicks > 0 && top_rage_pages.length === 0) {
    top_rage_pages.push({ url: "", rage_clicks: rageClicks });
  }

  return adaptClarity({
    sessions,
    deadClicks,
    quickBacks,
    devices: devices.length ? devices : undefined,
    top_rage_pages,
  });
}

export type CollectClarityInput = {
  token: string;
  period: { start: string; end: string };
  fetchFn?: FetchFn;
};

export async function collectClarity(
  input: CollectClarityInput,
): Promise<ClarityNormalized | null> {
  const fetchFn = input.fetchFn ?? fetch;
  const numOfDays = clarityNumOfDays(input.period.start, input.period.end);

  const response = await fetchFn(CLARITY_EXPORT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ numOfDays }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Clarity API falhou (${response.status}): ${text.slice(0, 240)}`,
    );
  }

  const payload = (await response.json()) as unknown;
  return parseClarityExportPayload(payload);
}
