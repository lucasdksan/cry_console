import { formatClarityCacheNote } from "@/backend/lib/clarity/clarity-cache-policy";
import type { MeasurementCollectResult } from "@/backend/lib/measurement/schemas";
import type { AnalyticsNormalized } from "@/backend/lib/normalized-adapters";
import type { ClarityNormalized } from "@/backend/lib/normalized-adapters";
import type { SearchConsoleNormalized } from "@/backend/lib/normalized-adapters";
import type { VtexCollectResult } from "@/backend/lib/vtex/schemas";
import type {
  OverviewClarityVisual,
  OverviewDTO,
  OverviewDotState,
  OverviewGa4Visual,
  OverviewGscVisual,
  OverviewHeroKpi,
  OverviewSourceKey,
  OverviewSourceState,
  OverviewVtexVisual,
} from "@/backend/lib/overview-types";
import {
  configDotsForWorkspace,
  isClarityConfigured,
  isGa4Configured,
  isGscConfigured,
  isVtexConfigured,
  sourceStateFromCollect,
} from "@/backend/lib/overview-status";
import type { WorkspaceOverviewListItem } from "@/backend/models/workspace.model";

const numberFmt = new Intl.NumberFormat("pt-BR");
const currencyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const pctFmt = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

function dash(): string {
  return "—";
}

function formatOptionalNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return dash();
  }
  return numberFmt.format(value);
}

function formatOptionalCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return dash();
  }
  return currencyFmt.format(value);
}

function formatOptionalPct(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return dash();
  }
  return `${pctFmt.format(value)}%`;
}

function analyticsFromMeasurement(
  result: MeasurementCollectResult | null,
): AnalyticsNormalized | null {
  if (!result?.analytics || typeof result.analytics !== "object") {
    return null;
  }
  return result.analytics as AnalyticsNormalized;
}

function searchConsoleFromMeasurement(
  result: MeasurementCollectResult | null,
): SearchConsoleNormalized | null {
  if (!result?.searchConsole || typeof result.searchConsole !== "object") {
    return null;
  }
  return result.searchConsole as SearchConsoleNormalized;
}

function clarityFromMeasurement(
  result: MeasurementCollectResult | null,
): ClarityNormalized | null {
  if (!result?.clarity || typeof result.clarity !== "object") {
    return null;
  }
  return result.clarity as ClarityNormalized;
}

function measurementSourceStatus(
  result: MeasurementCollectResult | null,
  source: "analytics" | "search-console" | "clarity",
): "ok" | "failed" | "skipped" {
  if (!result) {
    return "skipped";
  }
  const entry = result.sourceResults.find((r) => r.source === source);
  if (!entry) {
    return "skipped";
  }
  return entry.status;
}

function measurementSourceError(
  result: MeasurementCollectResult | null,
  source: "analytics" | "search-console" | "clarity",
): string | undefined {
  const entry = result?.sourceResults.find((r) => r.source === source);
  return entry?.status === "failed" ? entry.error : undefined;
}

function vtexCollectStatus(
  vtex: VtexCollectResult | null,
  configured: boolean,
): "ok" | "failed" | "skipped" {
  if (!configured) {
    return "skipped";
  }
  if (!vtex) {
    return "failed";
  }
  const orders = vtex.collectorResults.find((r) => r.collector === "orders");
  if (!orders || orders.status === "failed") {
    return "failed";
  }
  return "ok";
}

function vtexCollectError(vtex: VtexCollectResult | null): string | undefined {
  const orders = vtex?.collectorResults.find((r) => r.collector === "orders");
  return orders?.status === "failed" ? orders.error : vtex?.dataGaps[0]?.reason;
}

function resolveClarityPeriodNote(
  baseNote: string,
  measurement: MeasurementCollectResult | null,
): string {
  const meta = measurement?.clarityCollectMeta;
  if (!meta) {
    return baseNote;
  }
  const cacheNote = formatClarityCacheNote({
    fromCache: meta.fromCache,
    stale: meta.stale,
    collectedAt: new Date(meta.collectedAt),
  });
  if (!cacheNote) {
    return baseNote;
  }
  return `${baseNote}. ${cacheNote}`;
}

export type BuildOverviewInput = {
  workspace: WorkspaceOverviewListItem;
  periodLabel: string;
  clarityPeriodNote: string;
  vtex: VtexCollectResult | null;
  vtexError?: string;
  measurement: MeasurementCollectResult | null;
  collectedAt: string;
};

export function buildOverviewDto(input: BuildOverviewInput): OverviewDTO {
  const { workspace } = input;
  const vtexConfigured = isVtexConfigured(workspace);
  const gaConfigured = isGa4Configured(workspace);
  const gscConfigured = isGscConfigured(workspace);
  const clarityConfigured = isClarityConfigured(workspace);

  const vtexStatus = input.vtexError
    ? ("failed" as const)
    : vtexCollectStatus(input.vtex, vtexConfigured);
  const analyticsStatus = measurementSourceStatus(input.measurement, "analytics");
  const gscStatus = measurementSourceStatus(input.measurement, "search-console");
  const clarityStatus = measurementSourceStatus(input.measurement, "clarity");

  const sources: Record<OverviewSourceKey, OverviewSourceState> = {
    vtex: sourceStateFromCollect(
      vtexConfigured,
      vtexStatus,
      input.vtexError ?? vtexCollectError(input.vtex),
    ),
    analytics: sourceStateFromCollect(
      gaConfigured,
      analyticsStatus,
      measurementSourceError(input.measurement, "analytics"),
    ),
    "search-console": sourceStateFromCollect(
      gscConfigured,
      gscStatus,
      measurementSourceError(input.measurement, "search-console"),
    ),
    clarity: sourceStateFromCollect(
      clarityConfigured,
      clarityStatus,
      measurementSourceError(input.measurement, "clarity"),
    ),
  };

  const analytics = analyticsFromMeasurement(input.measurement);
  const searchConsole = searchConsoleFromMeasurement(input.measurement);
  const clarity = clarityFromMeasurement(input.measurement);
  const clarityPeriodNote = resolveClarityPeriodNote(
    input.clarityPeriodNote,
    input.measurement,
  );
  const vtexMetrics = input.vtex?.metrics;

  const gaOk = sources.analytics.dot === "ok";
  const vtexOk = sources.vtex.dot === "ok";

  const hero: OverviewHeroKpi[] = [
    {
      id: "visitors",
      label: "Visitantes",
      value: gaOk
        ? formatOptionalNumber(analytics?.totals?.totalUsers)
        : dash(),
      hint: "GA4",
    },
    {
      id: "sessions",
      label: "Sessões",
      value: gaOk
        ? formatOptionalNumber(analytics?.totals?.sessions)
        : dash(),
      hint: "GA4",
    },
    {
      id: "revenue",
      label: "Receita",
      value: vtexOk
        ? formatOptionalCurrency(vtexMetrics?.revenue)
        : dash(),
      hint: "VTEX",
    },
    {
      id: "orders",
      label: "Pedidos",
      value: vtexOk
        ? formatOptionalNumber(vtexMetrics?.order_count)
        : dash(),
      hint: "VTEX",
    },
    {
      id: "ticket",
      label: "Ticket médio",
      value:
        vtexOk &&
        vtexMetrics &&
        vtexMetrics.order_count > 0 &&
        vtexMetrics.revenue !== undefined
          ? formatOptionalCurrency(
              vtexMetrics.revenue / vtexMetrics.order_count,
            )
          : dash(),
      hint: "VTEX",
    },
    {
      id: "conversion",
      label: "Conversão",
      value: gaOk
        ? formatOptionalPct(analytics?.funnel_rates?.session_to_purchase_pct)
        : dash(),
      hint: "GA4",
    },
  ];

  let vtexVisual: OverviewVtexVisual | null = null;
  if (sources.vtex.dot === "ok" && vtexMetrics) {
    vtexVisual = {
      orderCount: vtexMetrics.order_count,
      canceled: vtexMetrics.canceled,
    };
  }

  let ga4Visual: OverviewGa4Visual | null = null;
  if (sources.analytics.dot === "ok" && analytics?.totals) {
    const t = analytics.totals;
    ga4Visual = {
      steps: [
        { label: "Visualizações", value: t.itemViewEvents ?? 0 },
        { label: "Carrinho", value: t.addToCarts ?? 0 },
        { label: "Checkout", value: t.checkouts ?? 0 },
        { label: "Compras", value: t.ecommercePurchases ?? 0 },
      ],
    };
  }

  let gscVisual: OverviewGscVisual | null = null;
  if (sources["search-console"].dot === "ok" && searchConsole?.overview) {
    const o = searchConsole.overview;
    gscVisual = {
      clicks: o.clicks,
      impressions: o.impressions,
      ctr: o.ctr,
      position: o.position,
    };
  }

  let clarityVisual: OverviewClarityVisual | null = null;
  if (sources.clarity.dot === "ok" && clarity) {
    const sessions = clarity.sessions ?? 0;
    const deadClicks = clarity.deadClicks ?? 0;
    clarityVisual = {
      sessions,
      deadClickRatePct: sessions > 0 ? (deadClicks / sessions) * 100 : 0,
      devices: (clarity.devices ?? []).map((d) => ({
        device: d.device,
        sharePct: d.share_pct,
      })),
      periodNote: clarityPeriodNote,
    };
  }

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    periodLabel: input.periodLabel,
    clarityPeriodNote,
    collectedAt: input.collectedAt,
    sources,
    hero,
    vtexVisual,
    ga4Visual,
    gscVisual,
    clarityVisual,
  };
}

export function chipDotsFromOverview(
  workspace: WorkspaceOverviewListItem,
  overview: OverviewDTO | null,
): Record<OverviewSourceKey, OverviewDotState> {
  if (!overview || overview.workspaceId !== workspace.id) {
    return configDotsForWorkspace(workspace);
  }
  return {
    vtex: overview.sources.vtex.dot,
    analytics: overview.sources.analytics.dot,
    "search-console": overview.sources["search-console"].dot,
    clarity: overview.sources.clarity.dot,
  };
}
