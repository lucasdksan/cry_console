"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";

import {
  getWorkspaceAnalysis,
  retryWorkspaceAnalysisNarrative,
  runWorkspaceAnalysis,
} from "@/backend/controllers/analysis.controller";
import type { WorkspaceAnalysisDTO } from "@/backend/lib/analysis/types";
import { PILLAR_TITLES } from "@/backend/lib/analysis/types";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/frontend/components/ui/empty";
import { Separator } from "@/frontend/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/frontend/components/ui/tabs";
import { cn } from "@/frontend/lib/utils";

type AnalysisBoardProps = {
  workspaceId: string;
  workspaceName: string;
  initial: WorkspaceAnalysisDTO | null;
};

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "Excelente" || status === "Bom") {
    return "default";
  }
  if (status === "Regular") {
    return "secondary";
  }
  if (status === "Crítico") {
    return "destructive";
  }
  return "outline";
}

function formatScore(score: number | null): string {
  if (score === null) {
    return "—";
  }
  return String(score);
}

export function AnalysisBoard({
  workspaceId,
  workspaceName,
  initial,
}: AnalysisBoardProps) {
  const [data, setData] = useState<WorkspaceAnalysisDTO | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const consolidatedPlan = useMemo(() => {
    if (!data?.narrative) {
      return [];
    }
    return data.narrative.pillars.flatMap((p) =>
      p.action_plan.map((item) => ({
        ...item,
        pillar: p.pillar,
      })),
    );
  }, [data]);

  const refresh = useCallback(async () => {
    const loaded = await getWorkspaceAnalysis(workspaceId);
    if (!loaded.ok) {
      setError(loaded.error);
      return;
    }
    setData(loaded.data);
  }, [workspaceId]);

  const runAnalysis = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const result = await runWorkspaceAnalysis(workspaceId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setData(result.data);
      if (result.data.narrativeError) {
        setError(result.data.narrativeError);
      }
    });
  }, [workspaceId]);

  const retryNarrative = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const result = await retryWorkspaceAnalysisNarrative(workspaceId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setData(result.data);
      if (result.data.narrativeError) {
        setError(result.data.narrativeError);
      } else {
        await refresh();
      }
    });
  }, [refresh, workspaceId]);

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nenhuma análise ainda</EmptyTitle>
            <EmptyDescription>
              Gere um relatório de saúde com os seis pilares, scores e plano de
              ação para {workspaceName}.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          disabled={pending}
          onClick={runAnalysis}
          className="w-fit"
        >
          {pending ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : null}
          Analisar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={pending} onClick={runAnalysis}>
          {pending ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : null}
          Analisar de novo
        </Button>
        {data.status === "narrative_failed" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={retryNarrative}
          >
            Gerar plano de novo
          </Button>
        ) : null}
        <span className="text-sm text-muted-foreground">
          Coletado em{" "}
          {new Date(data.collectedAt).toLocaleString("pt-BR")}
          {data.aiRoute ? ` · IA: ${data.aiRoute}` : null}
        </span>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Saúde geral</CardTitle>
          <CardDescription>
            {data.periodLabel} · {workspaceName}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div
            className={cn(
              "flex size-24 flex-col items-center justify-center rounded-full border-4",
              data.overallScore !== null && data.overallScore >= 75
                ? "border-primary"
                : "border-muted-foreground/30",
            )}
          >
            <span className="text-3xl font-semibold tabular-nums">
              {formatScore(data.overallScore)}
            </span>
            <span className="text-xs text-muted-foreground">de 100</span>
          </div>
          <Badge variant={statusBadgeVariant(data.overallStatus)}>
            {data.overallStatus}
          </Badge>
          {data.narrative?.executive_verdict ? (
            <div className="min-w-0 flex-1">
              <p className="font-medium">{data.narrative.executive_verdict.headline}</p>
              <p className="text-sm text-muted-foreground">
                {data.narrative.executive_verdict.primary_lever}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="pilares">
        <TabsList>
          <TabsTrigger value="pilares">Pilares</TabsTrigger>
          <TabsTrigger value="plano">Plano</TabsTrigger>
          <TabsTrigger value="lacunas">Lacunas</TabsTrigger>
        </TabsList>
        <TabsContent value="pilares" className="flex flex-col gap-4">
          {data.measurement.pillars.map((pillar) => {
            const narrativePillar = data.narrative?.pillars.find(
              (p) => p.pillar === pillar.pillar,
            );
            return (
              <Card key={pillar.pillar}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {PILLAR_TITLES[pillar.pillar]}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {pillar.available ? (
                        <span className="text-sm font-medium tabular-nums">
                          {formatScore(pillar.score ?? null)}
                        </span>
                      ) : null}
                      <Badge variant={statusBadgeVariant(pillar.status)}>
                        {pillar.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {Object.keys(pillar.metrics).length > 0 ? (
                    <ul className="grid gap-1 text-sm sm:grid-cols-2">
                      {Object.entries(pillar.metrics).map(([key, value]) => (
                        <li key={key}>
                          <span className="text-muted-foreground">{key}: </span>
                          <span className="font-medium">{String(value)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {pillar.alerts.length > 0 ? (
                    <ul className="flex flex-col gap-1 text-sm">
                      {pillar.alerts.map((a) => (
                        <li key={a.id}>
                          <Badge variant="outline" className="mr-2">
                            {a.severity}
                          </Badge>
                          {a.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {narrativePillar ? (
                    <>
                      <Separator />
                      <p className="text-sm">{narrativePillar.interpretation.summary}</p>
                      {narrativePillar.interpretation.diagnosis ? (
                        <p className="text-sm text-muted-foreground">
                          {narrativePillar.interpretation.diagnosis}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
        <TabsContent value="plano" className="flex flex-col gap-4">
          {consolidatedPlan.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Plano indisponível</EmptyTitle>
                <EmptyDescription>
                  {data.status === "narrative_failed"
                    ? "A medição foi salva, mas a IA não gerou o plano. Tente de novo."
                    : "Execute a análise para gerar recomendações."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            consolidatedPlan.map((item, index) => (
              <Card key={`${item.title}-${index}`}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{item.priority}</Badge>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </div>
                  <CardDescription>{item.problem}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <p>{item.action}</p>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {item.action_steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground">
                    Métrica-alvo: {item.target_metric} · {item.expected_impact}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        <TabsContent value="lacunas">
          <Card>
            <CardContent className="pt-6">
              {data.measurement.dataGaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma lacuna registrada neste run.
                </p>
              ) : (
                <ul className="flex flex-col gap-3 text-sm">
                  {data.measurement.dataGaps.map((gap, i) => (
                    <li key={`${gap.source}-${i}`}>
                      <span className="font-medium">{gap.source}</span>
                      <p className="text-muted-foreground">{gap.reason}</p>
                      <p>{gap.impact}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
