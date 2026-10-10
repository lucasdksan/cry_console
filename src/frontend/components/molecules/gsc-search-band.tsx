import type { OverviewGscVisual } from "@/backend/lib/overview/types";
import {
  formatCtrRatio,
  formatGscPosition,
  formatPtInteger,
} from "@/frontend/lib/format-analysis-metric";

type GscSearchBandProps = {
  data: OverviewGscVisual;
};

export function GscSearchBand({ data }: GscSearchBandProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-[var(--radius-md)] bg-muted/50 px-3 py-2">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          Cliques
        </p>
        <p className="text-lg font-semibold tabular-nums">
          {formatPtInteger(data.clicks)}
        </p>
      </div>
      <div className="rounded-[var(--radius-md)] bg-muted/50 px-3 py-2">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          Impressões
        </p>
        <p className="text-lg font-semibold tabular-nums">
          {formatPtInteger(data.impressions)}
        </p>
      </div>
      <div className="rounded-[var(--radius-md)] bg-muted/50 px-3 py-2">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          CTR
        </p>
        <p className="text-lg font-semibold tabular-nums">
          {formatCtrRatio(data.ctr)}
        </p>
      </div>
      <div className="rounded-[var(--radius-md)] bg-muted/50 px-3 py-2">
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          Posição
        </p>
        <p className="text-lg font-semibold tabular-nums">
          {formatGscPosition(data.position)}
        </p>
      </div>
    </div>
  );
}
