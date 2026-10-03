export const OVERVIEW_SOURCES = [
  "vtex",
  "analytics",
  "search-console",
  "clarity",
] as const;

export type OverviewSourceKey = (typeof OVERVIEW_SOURCES)[number];

export type OverviewDotState = "missing" | "untested" | "ok" | "failed";

export type OverviewSourceState = {
  dot: OverviewDotState;
  error?: string;
};

export type OverviewHeroKpi = {
  id: string;
  label: string;
  value: string;
  hint?: string;
};

export type OverviewVtexVisual = {
  orderCount: number;
  canceled: number;
};

export type OverviewGa4Visual = {
  steps: Array<{ label: string; value: number }>;
};

export type OverviewGscVisual = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type OverviewClarityVisual = {
  sessions: number;
  deadClickRatePct: number;
  devices: Array<{ device: string; sharePct: number }>;
  periodNote: string;
};

export type OverviewDTO = {
  workspaceId: string;
  workspaceName: string;
  periodLabel: string;
  clarityPeriodNote: string;
  collectedAt: string | null;
  sources: Record<OverviewSourceKey, OverviewSourceState>;
  hero: OverviewHeroKpi[];
  vtexVisual: OverviewVtexVisual | null;
  ga4Visual: OverviewGa4Visual | null;
  gscVisual: OverviewGscVisual | null;
  clarityVisual: OverviewClarityVisual | null;
};
