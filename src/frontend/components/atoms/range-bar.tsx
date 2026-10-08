import { cn } from "@/frontend/lib/utils";

export type RangeBarTone = "danger" | "ok" | "primary";

const fillClass: Record<RangeBarTone, string> = {
  danger: "bg-[var(--status-failed)]",
  ok: "bg-[var(--status-ok)]",
  primary: "bg-primary",
};

type RangeBarProps = {
  fillValue: number;
  minMarker: number;
  maxMarker: number;
  tone: RangeBarTone;
  ariaLabel: string;
  className?: string;
};

function clampPct(value: number, scaleMax: number): number {
  if (scaleMax <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (value / scaleMax) * 100));
}

export function RangeBar({
  fillValue,
  minMarker,
  maxMarker,
  tone,
  ariaLabel,
  className,
}: RangeBarProps) {
  const scaleMax = Math.max(fillValue, maxMarker, minMarker, 1);
  const fillPct = clampPct(fillValue, scaleMax);
  const minPct = clampPct(minMarker, scaleMax);
  const maxPct = clampPct(maxMarker, scaleMax);

  return (
    <div
      className={cn("relative h-2 w-full rounded-full bg-muted", className)}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={scaleMax}
      aria-valuenow={fillValue}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full transition-[width]",
          fillClass[tone],
        )}
        style={{ width: `${fillPct}%` }}
      />
      <div
        className="absolute top-1/2 z-10 h-3 w-0.5 -translate-y-1/2 bg-[var(--status-failed)]"
        style={{ left: `${minPct}%` }}
        aria-hidden
        title="Mínimo esperado"
      />
      <div
        className="absolute top-1/2 z-10 h-3 w-0.5 -translate-y-1/2 bg-[var(--status-untested)]"
        style={{ left: `${maxPct}%` }}
        aria-hidden
        title="Meta"
      />
    </div>
  );
}
