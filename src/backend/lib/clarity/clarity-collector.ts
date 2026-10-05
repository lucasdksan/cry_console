import { clarityNumOfDays } from "@/backend/lib/google/period";
import {
  adaptClarity,
  type ClarityNormalized,
} from "@/backend/lib/shared/normalized-adapters";

export type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const CLARITY_EXPORT_URL =
  "https://www.clarity.ms/export-data/api/v1/project-live-insights";

type ClarityMetricRow = Record<string, unknown>;

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function metricKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function readField(row: ClarityMetricRow, names: string[]): number | null {
  const wanted = new Set(names.map((name) => metricKey(name)));
  for (const [key, value] of Object.entries(row)) {
    if (!wanted.has(metricKey(key)) || value == null || value === "") continue;
    return asNumber(value);
  }
  return null;
}

function dimensionValue(row: ClarityMetricRow, dimension: string): string {
  const wanted = metricKey(dimension);
  for (const [key, value] of Object.entries(row)) {
    if (metricKey(key) !== wanted || value == null || typeof value === "object") {
      continue;
    }
    return String(value);
  }
  return "";
}

function informationRows(row: ClarityMetricRow): ClarityMetricRow[] {
  const raw = row.information ?? row.Information;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is ClarityMetricRow =>
      Boolean(item) && typeof item === "object",
  );
}

function interactionCount(rows: ClarityMetricRow[]): number {
  return rows.reduce((sum, row) => {
    const count =
      readField(row, ["sessionsCount"]) ?? readField(row, ["subTotal"]) ?? 0;
    return sum + count;
  }, 0);
}

function isOfficialPayload(rows: ClarityMetricRow[]): boolean {
  return rows.some((row) => Array.isArray(row.information ?? row.Information));
}

function parseOfficialClarityPayload(
  rows: ClarityMetricRow[],
): ClarityNormalized | null {
  let sessions = 0;
  let deadClicks = 0;
  let quickBacks = 0;
  let rageClicks = 0;
  const devices: Array<{ device: string; sessions: number; share_pct: number }> =
    [];
  const top_rage_pages: Array<{ url: string; rage_clicks: number }> = [];

  for (const row of rows) {
    const name = metricKey(String(row.metricName ?? row.MetricName ?? ""));
    const information = informationRows(row);

    if (name === "traffic") {
      for (const info of information) {
        const count = readField(info, ["totalSessionCount"]) ?? 0;
        sessions += count;
        const device = dimensionValue(info, "Device");
        if (device) {
          devices.push({ device, sessions: count, share_pct: 0 });
        }
      }
      continue;
    }

    if (name.includes("deadclick")) {
      deadClicks += interactionCount(information);
      continue;
    }

    if (name.includes("quickback")) {
      quickBacks += interactionCount(information);
      continue;
    }

    if (name.includes("rageclick")) {
      for (const info of information) {
        const clicks =
          readField(info, ["subTotal"]) ??
          readField(info, ["sessionsCount"]) ??
          0;
        const url = dimensionValue(info, "URL");
        if (url) {
          top_rage_pages.push({ url, rage_clicks: clicks });
        } else {
          rageClicks += clicks;
        }
      }
    }
  }

  const deviceTotal = devices.reduce((sum, device) => sum + device.sessions, 0);
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

function parseClarityExportPayload(payload: unknown): ClarityNormalized | null {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? ((payload as { data: ClarityMetricRow[] }).data ?? [])
      : [];

  if (!rows.length) {
    return adaptClarity({ sessions: 0, deadClicks: 0, quickBacks: 0 });
  }

  if (isOfficialPayload(rows)) {
    return parseOfficialClarityPayload(rows);
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

  const params = new URLSearchParams({
    numOfDays,
    dimension1: "Device",
  });
  const response = await fetchFn(`${CLARITY_EXPORT_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${input.token}`,
      Accept: "application/json",
    },
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
