import type { OverviewHeroKpi } from "@/backend/lib/overview-types";
import { KpiStat } from "@/frontend/components/molecules/kpi-stat";
import { Skeleton } from "@/frontend/components/ui/skeleton";

type OverviewHeroProps = {
  kpis: OverviewHeroKpi[] | null;
  loading: boolean;
};

export function OverviewHero({ kpis, loading }: OverviewHeroProps) {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-[var(--radius-lg)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {kpis.map((kpi) => (
        <KpiStat
          key={kpi.id}
          label={kpi.label}
          value={kpi.value}
          hint={kpi.hint}
        />
      ))}
    </div>
  );
}
