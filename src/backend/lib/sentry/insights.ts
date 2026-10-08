import { z } from "zod";

import type { IssueFrame } from "@/backend/lib/sentry/issue-diagnosis";

/** Períodos aceitos pelo Sentry em `/projects/.../issues/` (statsPeriod). */
export const observabilityPeriodSchema = z.enum(["24h", "14d"]);
export type ObservabilityPeriod = z.infer<typeof observabilityPeriodSchema>;

const LEGACY_PERIOD_ALIASES: Record<string, ObservabilityPeriod> = {
  "7d": "14d",
};

export const observabilityPageFilterSchema = z.enum([
  "all",
  "home",
  "plp",
  "pdp",
]);
export type ObservabilityPageFilter = z.infer<
  typeof observabilityPageFilterSchema
>;

export type VitalKey = "lcp" | "inp" | "cls" | "fcp" | "ttfb";

export type VitalRating = "good" | "needs-improvement" | "poor";

const PERIOD_LABELS: Record<ObservabilityPeriod, string> = {
  "24h": "Últimas 24 horas",
  "14d": "Últimos 14 dias",
};

const PAGE_FILTER_LABELS: Record<ObservabilityPageFilter, string> = {
  all: "Todas",
  home: "Home",
  plp: "PLP",
  pdp: "PDP",
};

export function parseObservabilityPeriod(
  raw: string | undefined,
): ObservabilityPeriod {
  if (raw && raw in LEGACY_PERIOD_ALIASES) {
    return LEGACY_PERIOD_ALIASES[raw]!;
  }
  const parsed = observabilityPeriodSchema.safeParse(raw);
  return parsed.success ? parsed.data : "14d";
}

export function sentryStatsPeriod(period: ObservabilityPeriod): string {
  return period;
}

export function parseObservabilityPageFilter(
  raw: string | undefined,
): ObservabilityPageFilter {
  const parsed = observabilityPageFilterSchema.safeParse(raw);
  return parsed.success ? parsed.data : "all";
}

export function observabilityPeriodLabel(period: ObservabilityPeriod): string {
  return PERIOD_LABELS[period];
}

export function observabilityPageFilterLabel(
  filter: ObservabilityPageFilter,
): string {
  return PAGE_FILTER_LABELS[filter];
}

export function buildIssuesListQuery(
  pageFilter: ObservabilityPageFilter,
): string {
  const parts = ["is:unresolved"];
  if (pageFilter !== "all") {
    parts.push(`page_type:${pageFilter}`);
  }
  return parts.join(" ");
}

export function buildTransactionsDiscoverQuery(
  projectSlug: string,
  pageFilter: ObservabilityPageFilter,
): string {
  const parts = [`event.type:transaction`, `project:${projectSlug}`];
  if (pageFilter !== "all") {
    parts.push(`page_type:${pageFilter}`);
  }
  return parts.join(" ");
}

export const VITAL_FIELD_KEYS: VitalKey[] = [
  "lcp",
  "inp",
  "cls",
  "fcp",
  "ttfb",
];

export function vitalDiscoverField(key: VitalKey): string {
  return `p75(measurements.${key})`;
}

export function vitalDiscoverFields(): string[] {
  return VITAL_FIELD_KEYS.map(vitalDiscoverField);
}

type VitalThreshold = {
  goodMax: number;
  poorMin: number;
  unit: "ms" | "unitless";
  label: string;
};

const VITAL_THRESHOLDS: Record<VitalKey, VitalThreshold> = {
  lcp: { goodMax: 2500, poorMin: 4000, unit: "ms", label: "LCP" },
  inp: { goodMax: 200, poorMin: 500, unit: "ms", label: "INP" },
  cls: { goodMax: 0.1, poorMin: 0.25, unit: "unitless", label: "CLS" },
  fcp: { goodMax: 1800, poorMin: 3000, unit: "ms", label: "FCP" },
  ttfb: { goodMax: 800, poorMin: 1800, unit: "ms", label: "TTFB" },
};

/** Normaliza duração do Sentry (segundos ou ms) para ms. */
export function normalizeDurationMs(raw: number | null | undefined): number | null {
  if (raw === null || raw === undefined || Number.isNaN(raw)) {
    return null;
  }
  if (raw <= 0) {
    return null;
  }
  if (raw < 60) {
    return raw * 1000;
  }
  return raw;
}

export function normalizeCls(raw: number | null | undefined): number | null {
  if (raw === null || raw === undefined || Number.isNaN(raw)) {
    return null;
  }
  if (raw < 0) {
    return null;
  }
  return raw;
}

export function normalizeVitalValue(
  key: VitalKey,
  raw: number | null | undefined,
): number | null {
  if (key === "cls") {
    return normalizeCls(raw);
  }
  return normalizeDurationMs(raw);
}

export function rateVital(key: VitalKey, valueMsOrCls: number): VitalRating {
  const t = VITAL_THRESHOLDS[key];
  if (valueMsOrCls <= t.goodMax) {
    return "good";
  }
  if (valueMsOrCls >= t.poorMin) {
    return "poor";
  }
  return "needs-improvement";
}

export function formatVitalDisplay(
  key: VitalKey,
  value: number | null,
): string | null {
  if (value === null) {
    return null;
  }
  const t = VITAL_THRESHOLDS[key];
  if (t.unit === "unitless") {
    return value.toFixed(3);
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }
  return `${Math.round(value)} ms`;
}

export function vitalThresholdMeta(key: VitalKey): VitalThreshold {
  return VITAL_THRESHOLDS[key];
}

export function buildIssuePermalink(orgSlug: string, issueId: string): string {
  return `https://sentry.io/organizations/${orgSlug}/issues/${issueId}/`;
}

export function buildReplayPermalink(orgSlug: string, replayId: string): string {
  return `https://sentry.io/organizations/${orgSlug}/replays/${replayId}/`;
}

type SentryIssueRow = {
  id: string;
  title: string;
  level?: string;
  count?: string | number;
  userCount?: string | number;
  lastSeen?: string;
  permalink?: string;
  culprit?: string;
  isUnhandled?: boolean;
  metadata?: {
    value?: string;
    type?: string;
    filename?: string;
    function?: string;
  };
};

export type ParsedObservabilityIssue = {
  id: string;
  title: string;
  level: string;
  count: number;
  userCount: number | null;
  lastSeen: string;
  pageType: string | null;
  permalink: string;
  culprit: string | null;
  exceptionType: string | null;
  exceptionValue: string | null;
  filename: string | null;
  functionName: string | null;
  pageUrl: string | null;
  unhandled: boolean | null;
  frames: IssueFrame[];
};

export function parseSentryIssues(
  rows: SentryIssueRow[],
  orgSlug: string,
): ParsedObservabilityIssue[] {
  return rows.map((row) => {
    const metadata = row.metadata;
    return {
      id: row.id,
      title: row.title || metadata?.value || "Erro sem título",
      level: row.level ?? "error",
      count: readCount(row.count),
      userCount: readOptionalCount(row.userCount),
      lastSeen: row.lastSeen ?? new Date(0).toISOString(),
      pageType: null,
      permalink: row.permalink ?? buildIssuePermalink(orgSlug, row.id),
      culprit: cleanText(row.culprit),
      exceptionType: cleanText(metadata?.type),
      exceptionValue: cleanText(metadata?.value),
      filename: cleanText(metadata?.filename),
      functionName: cleanText(metadata?.function),
      pageUrl: null,
      unhandled: typeof row.isUnhandled === "boolean" ? row.isUnhandled : null,
      frames: [],
    };
  });
}

function readCount(raw: string | number | undefined): number {
  const parsed = readOptionalCount(raw);
  return parsed ?? 0;
}

function readOptionalCount(raw: string | number | undefined): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function cleanText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

type DiscoverRow = Record<string, unknown>;

function readDiscoverNumber(row: DiscoverRow, field: string): number | null {
  const value = row[field];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readPageTypeFromRow(row: DiscoverRow): ObservabilityPageFilter | "all" {
  const candidates = [
    row["tags[page_type]"],
    row["tag[page_type]"],
    row.page_type,
  ];
  for (const c of candidates) {
    if (c === "home" || c === "plp" || c === "pdp") {
      return c;
    }
  }
  return "all";
}

export type ParsedVitalsGroup = {
  pageType: "home" | "plp" | "pdp" | "all";
  transactionCount: number | null;
  vitals: Array<{
    key: VitalKey;
    label: string;
    p75: number | null;
    displayValue: string | null;
    rating: VitalRating | null;
    unit: "ms" | "unitless";
  }>;
};

export function parseDiscoverVitalsRows(
  rows: DiscoverRow[],
  pageFilter: ObservabilityPageFilter,
): ParsedVitalsGroup[] {
  if (rows.length === 0) {
    if (pageFilter !== "all") {
      return [
        {
          pageType: pageFilter,
          transactionCount: null,
          vitals: buildEmptyVitals(),
        },
      ];
    }
    return [];
  }

  return rows.map((row) => {
    const pageTypeRaw =
      pageFilter !== "all" ? pageFilter : readPageTypeFromRow(row);
    const pageType =
      pageTypeRaw === "home" || pageTypeRaw === "plp" || pageTypeRaw === "pdp"
        ? pageTypeRaw
        : ("all" as const);

    const transactionCount = readDiscoverNumber(row, "count()");

    const vitals = VITAL_FIELD_KEYS.map((key) => {
      const raw = readDiscoverNumber(row, vitalDiscoverField(key));
      const normalized = normalizeVitalValue(key, raw);
      const meta = vitalThresholdMeta(key);
      return {
        key,
        label: meta.label,
        p75: normalized,
        displayValue: formatVitalDisplay(key, normalized),
        rating:
          normalized === null ? null : rateVital(key, normalized),
        unit: meta.unit,
      };
    });

    return {
      pageType,
      transactionCount,
      vitals,
    };
  });
}

function buildEmptyVitals(): ParsedVitalsGroup["vitals"] {
  return VITAL_FIELD_KEYS.map((key) => {
    const meta = vitalThresholdMeta(key);
    return {
      key,
      label: meta.label,
      p75: null,
      displayValue: null,
      rating: null,
      unit: meta.unit,
    };
  });
}

type SentryReplayRow = {
  id: string;
  started_at?: string;
  finished_at?: string;
  duration?: number;
  count_errors?: number;
  error_ids?: string[];
  browser?: { name?: string; version?: string };
  os?: { name?: string };
  urls?: string[];
};

export type ParsedObservabilityReplay = {
  id: string;
  startedAt: string;
  durationMs: number | null;
  browser: string | null;
  urls: string[];
  errorCount: number;
  permalink: string;
};

export function parseSentryReplays(
  rows: SentryReplayRow[],
  orgSlug: string,
): ParsedObservabilityReplay[] {
  return rows.map((row) => {
    const browserName = row.browser?.name;
    const browserVersion = row.browser?.version;
    const browser =
      browserName && browserVersion
        ? `${browserName} ${browserVersion}`
        : browserName ?? null;

    let durationMs: number | null = null;
    if (typeof row.duration === "number" && row.duration >= 0) {
      durationMs =
        row.duration < 3600 ? row.duration * 1000 : row.duration;
    }

    const errorCount =
      typeof row.count_errors === "number"
        ? row.count_errors
        : Array.isArray(row.error_ids)
          ? row.error_ids.length
          : 0;

    return {
      id: row.id,
      startedAt: row.started_at ?? new Date(0).toISOString(),
      durationMs,
      browser,
      urls: Array.isArray(row.urls) ? row.urls.slice(0, 3) : [],
      errorCount,
      permalink: buildReplayPermalink(orgSlug, row.id),
    };
  });
}

export function vitalsGroupPageLabel(
  pageType: ParsedVitalsGroup["pageType"],
): string {
  if (pageType === "all") {
    return "Geral";
  }
  return observabilityPageFilterLabel(pageType);
}
