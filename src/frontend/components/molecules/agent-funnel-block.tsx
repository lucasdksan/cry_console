"use client";

import type { AgentFunnelPart } from "@/backend/lib/agent/types";
import { Badge } from "@/frontend/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

type AgentFunnelBlockProps = {
  part: AgentFunnelPart;
};

const numberFmt = new Intl.NumberFormat("pt-BR");

export function AgentFunnelBlock({ part }: AgentFunnelBlockProps) {
  const max = Math.max(...part.steps.map((s) => s.value), 1);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Funil GA4</CardTitle>
        {part.bottleneckLabel ? (
          <p className="text-xs text-muted-foreground">
            Gargalo: {part.bottleneckLabel}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {part.steps.map((step, index) => {
          const widthPct = (step.value / max) * 100;
          const transition = part.transitions[index];
          return (
            <div key={step.label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{step.label}</span>
                <span className="font-medium tabular-nums">
                  {numberFmt.format(step.value)}
                </span>
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
              {transition ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    → {transition.toLabel}:{" "}
                    {transition.passRatePct !== null
                      ? `${transition.passRatePct.toFixed(1)}%`
                      : "—"}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    perda {numberFmt.format(transition.dropCount)}
                  </Badge>
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
