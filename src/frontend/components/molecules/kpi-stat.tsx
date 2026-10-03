type KpiStatProps = {
  label: string;
  value: string;
  hint?: string;
};

export function KpiStat({ label, value, hint }: KpiStatProps) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-border/80 bg-card/80 px-4 py-3">
      <span className="text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {value}
      </span>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}
