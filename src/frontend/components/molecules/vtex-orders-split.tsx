import type { OverviewVtexVisual } from "@/backend/lib/overview/types";

type VtexOrdersSplitProps = {
  data: OverviewVtexVisual;
};

export function VtexOrdersSplit({ data }: VtexOrdersSplitProps) {
  const fulfilled = Math.max(0, data.orderCount - data.canceled);
  const total = Math.max(data.orderCount, 1);
  const fulfilledPct = (fulfilled / total) * 100;
  const canceledPct = (data.canceled / total) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-[var(--status-ok)] transition-[width]"
          style={{ width: `${fulfilledPct}%` }}
        />
        <div
          className="h-full bg-[var(--status-failed)] transition-[width]"
          style={{ width: `${canceledPct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-muted-foreground">
          Concluídos{" "}
          <strong className="text-foreground">{fulfilled}</strong>
        </span>
        <span className="text-muted-foreground">
          Cancelados{" "}
          <strong className="text-destructive">{data.canceled}</strong>
        </span>
      </div>
    </div>
  );
}
