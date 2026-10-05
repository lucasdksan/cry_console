"use client";

import type { AgentActionPlanPart } from "@/backend/lib/agent/types";
import { Badge } from "@/frontend/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

type AgentActionPlanBlockProps = {
  part: AgentActionPlanPart;
};

const priorityLabel: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export function AgentActionPlanBlock({ part }: AgentActionPlanBlockProps) {
  if (part.emptyMessage || part.items.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Plano de ação</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nenhum plano de ação salvo na análise deste período.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {part.items.map((item, index) => (
        <Card key={`${item.title}-${index}`} className="border-border/60">
          <CardHeader className="gap-2 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {item.pillarTitle}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {priorityLabel[item.priority] ?? item.priority}
              </Badge>
            </div>
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p>
              <span className="font-medium">Problema: </span>
              {item.problem}
            </p>
            <p>
              <span className="font-medium">Ação: </span>
              {item.action}
            </p>
            {item.actionSteps.length > 0 ? (
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                {item.actionSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Métrica-alvo: {item.targetMetric} · Impacto esperado:{" "}
              {item.expectedImpact}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
