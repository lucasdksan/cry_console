import { Badge } from "@/frontend/components/ui/badge";
import { cn } from "@/frontend/lib/utils";

type PageAuditScoreStripProps = {
  label: string;
  score: number | null;
  subtitle?: string;
  className?: string;
};

function scoreTone(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

export function PageAuditScoreStrip({
  label,
  score,
  subtitle,
  className,
}: PageAuditScoreStripProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div>
        <p className="text-sm font-medium">{label}</p>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-3xl font-semibold tabular-nums", scoreTone(score))}>
          {score === null ? "—" : score}
        </span>
        {score !== null ? (
          <Badge variant="outline" className="text-xs">
            / 100
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
