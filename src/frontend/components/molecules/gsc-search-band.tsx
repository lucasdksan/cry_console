import type { OverviewGscVisual } from "@/backend/lib/overview/types";

type GscSearchBandProps = {
  data: OverviewGscVisual;
};

const pct = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

export function GscSearchBand({ data }: GscSearchBandProps) {
  const ctrPct = data.ctr <= 1 ? data.ctr * 100 : data.ctr;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-[var(--radius-md)] bg-muted/50 px-3 py-2">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          Cliques
        </p>
        <p className="text-lg font-semibold tabular-nums">{data.clicks}</p>
      </div>
      <div className="rounded-[var(--radius-md)] bg-muted/50 px-3 py-2">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          Impressões
        </p>
        <p className="text-lg font-semibold tabular-nums">{data.impressions}</p>
      </div>
      <div className="rounded-[var(--radius-md)] bg-muted/50 px-3 py-2">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          CTR
        </p>
        <p className="text-lg font-semibold tabular-nums">{pct.format(ctrPct)}%</p>
      </div>
      <div className="rounded-[var(--radius-md)] bg-muted/50 px-3 py-2">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          Posição
        </p>
        <p className="text-lg font-semibold tabular-nums">
          {pct.format(data.position)}
        </p>
      </div>
    </div>
  );
}
