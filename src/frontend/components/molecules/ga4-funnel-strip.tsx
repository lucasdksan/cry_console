import type { OverviewGa4Visual } from "@/backend/lib/overview/types";

type Ga4FunnelStripProps = {
  data: OverviewGa4Visual;
};

export function Ga4FunnelStrip({ data }: Ga4FunnelStripProps) {
  const max = Math.max(...data.steps.map((s) => s.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {data.steps.map((step, index) => {
        const widthPct = (step.value / max) * 100;
        return (
          <div key={step.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{step.label}</span>
              <span className="font-medium tabular-nums">{step.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/80"
                style={{
                  width: `${widthPct}%`,
                  opacity: 1 - index * 0.12,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
