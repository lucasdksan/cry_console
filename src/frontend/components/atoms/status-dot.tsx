import { cn } from "@/frontend/lib/utils";
import type { OverviewDotState } from "@/backend/lib/overview-types";

const dotClass: Record<OverviewDotState, string> = {
  missing: "bg-[var(--status-missing)]",
  untested: "bg-[var(--status-untested)]",
  ok: "bg-[var(--status-ok)]",
  failed: "bg-[var(--status-failed)]",
};

type StatusDotProps = {
  state: OverviewDotState;
  label: string;
  className?: string;
};

export function StatusDot({ state, label, className }: StatusDotProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={label}
    >
      <span
        className={cn("size-2 shrink-0 rounded-full", dotClass[state])}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
