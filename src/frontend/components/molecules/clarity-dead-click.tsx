import type { OverviewClarityVisual } from "@/backend/lib/overview/types";

type ClarityDeadClickProps = {
  data: OverviewClarityVisual;
};

export function ClarityDeadClick({ data }: ClarityDeadClickProps) {
  const rate = Math.min(100, Math.max(0, data.deadClickRatePct));
  const circumference = 2 * Math.PI * 42;
  const dash = (rate / 100) * circumference;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative mx-auto size-28 shrink-0 sm:mx-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="10"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="var(--status-failed)"
            strokeWidth="10"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold tabular-nums">
            {rate.toFixed(1)}%
          </span>
          <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
            dead clicks
          </span>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <p className="text-xs text-muted-foreground">{data.periodNote}</p>
        {data.devices.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {data.devices.slice(0, 3).map((device) => (
              <li
                key={device.device}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-muted-foreground">{device.device}</span>
                <span className="font-medium tabular-nums">
                  {device.sharePct.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sem split por device.</p>
        )}
      </div>
    </div>
  );
}
