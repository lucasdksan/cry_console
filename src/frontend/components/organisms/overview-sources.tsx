import type { OverviewDTO, OverviewSourceKey } from "@/backend/lib/overview/types";
import { ClarityDeadClick } from "@/frontend/components/molecules/clarity-dead-click";
import { Ga4FunnelStrip } from "@/frontend/components/molecules/ga4-funnel-strip";
import { GscSearchBand } from "@/frontend/components/molecules/gsc-search-band";
import { SourceErrorPanel } from "@/frontend/components/molecules/source-error-panel";
import { VtexOrdersSplit } from "@/frontend/components/molecules/vtex-orders-split";
import { StatusDot } from "@/frontend/components/atoms/status-dot";
import { Skeleton } from "@/frontend/components/ui/skeleton";

const SOURCE_META: Record<
  OverviewSourceKey,
  { title: string; kicker: string }
> = {
  vtex: { title: "VTEX", kicker: "Pedidos e cancelamentos" },
  analytics: { title: "Google Analytics 4", kicker: "Funil de conversão" },
  "search-console": {
    title: "Google Search",
    kicker: "Visibilidade orgânica",
  },
  clarity: { title: "Microsoft Clarity", kicker: "Experiência no site" },
};

type OverviewSourcesProps = {
  overview: OverviewDTO | null;
  loading: boolean;
  workspaceId: string;
};

function SourceShell({
  sourceKey,
  overview,
  workspaceId,
  children,
}: {
  sourceKey: OverviewSourceKey;
  overview: OverviewDTO;
  workspaceId: string;
  children: React.ReactNode;
}) {
  const meta = SOURCE_META[sourceKey];
  const state = overview.sources[sourceKey];

  return (
    <article className="flex h-full min-h-44 flex-col gap-4 rounded-[var(--radius-xl)] border border-border/80 bg-card p-4 sm:min-h-48 sm:p-5">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
            {meta.kicker}
          </span>
          <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold">
            {meta.title}
          </h3>
        </div>
        <StatusDot state={state.dot} label={meta.title} />
      </header>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        {state.dot === "missing" ? (
          <p className="text-sm text-muted-foreground">
            Integração não configurada nesta loja.
          </p>
        ) : state.dot === "failed" ? (
          <SourceErrorPanel
            title={`Não foi possível carregar ${meta.title}`}
            message={state.error}
            workspaceId={workspaceId}
          />
        ) : state.dot === "untested" ? (
          <p className="text-sm text-muted-foreground">Coleta pendente.</p>
        ) : (
          children
        )}
      </div>
    </article>
  );
}

export function OverviewSources({
  overview,
  loading,
  workspaceId,
}: OverviewSourcesProps) {
  if (loading || !overview) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            className="min-h-44 rounded-[var(--radius-xl)] sm:min-h-48"
          />
        ))}
      </div>
    );
  }

  const sources: OverviewSourceKey[] = [
    "vtex",
    "analytics",
    "search-console",
    "clarity",
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch">
      {sources.map((sourceKey) => (
        <SourceShell
          key={sourceKey}
          sourceKey={sourceKey}
          overview={overview}
          workspaceId={workspaceId}
        >
          {sourceKey === "vtex" && overview.vtexVisual ? (
            <VtexOrdersSplit data={overview.vtexVisual} />
          ) : null}
          {sourceKey === "analytics" && overview.ga4Visual ? (
            <Ga4FunnelStrip data={overview.ga4Visual} />
          ) : null}
          {sourceKey === "search-console" && overview.gscVisual ? (
            <GscSearchBand data={overview.gscVisual} />
          ) : null}
          {sourceKey === "clarity" && overview.clarityVisual ? (
            <ClarityDeadClick data={overview.clarityVisual} />
          ) : null}
          {sourceKey === "vtex" &&
          overview.sources.vtex.dot === "ok" &&
          !overview.vtexVisual ? (
            <p className="text-sm text-muted-foreground">Sem pedidos no período.</p>
          ) : null}
        </SourceShell>
      ))}
    </div>
  );
}
