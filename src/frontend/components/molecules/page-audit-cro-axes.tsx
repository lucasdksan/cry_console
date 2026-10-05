import type { CroHeuristicBlock } from "@/backend/lib/page-audit/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { cn } from "@/frontend/lib/utils";

const AXIS_LABELS: Record<keyof CroHeuristicBlock["heuristicScores"], string> = {
  m: "Motivação",
  v: "Valor",
  i: "Incentivo",
  f: "Fricção",
  a: "Ansiedade",
};

function barWidth(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

type PageAuditCroAxesProps = {
  cro: CroHeuristicBlock;
};

export function PageAuditCroAxes({ cro }: PageAuditCroAxesProps) {
  const entries = Object.entries(cro.heuristicScores) as [
    keyof CroHeuristicBlock["heuristicScores"],
    number,
  ][];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Eixos de conversão</CardTitle>
        <CardDescription>
          Modelo heurístico (0–1). Fricção e ansiedade: quanto menor, melhor.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {entries.map(([key, value]) => {
          const inverse = key === "f" || key === "a";
          const display = inverse ? 1 - value : value;
          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span>{AXIS_LABELS[key]}</span>
                <span className="tabular-nums text-muted-foreground">{value.toFixed(2)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    inverse ? "bg-destructive/80" : "bg-primary/80",
                  )}
                  style={{ width: barWidth(display) }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
