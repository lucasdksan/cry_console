"use client";

import { useCallback, useMemo, useState, useTransition } from "react";

import type { WorkspaceMetricKey } from "@/generated/prisma/client";

import { getWorkspaceAvisos } from "@/backend/controllers/alert.controller";
import type { WorkspaceAvisosDTO } from "@/backend/lib/workspace-avisos-dto";
import { AvisoMetricCard } from "@/frontend/components/molecules/aviso-metric-card";
import { AvisoMetricChart } from "@/frontend/components/organisms/aviso-metric-chart";
import { SourceErrorPanel } from "@/frontend/components/molecules/source-error-panel";
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
import { Skeleton } from "@/frontend/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/frontend/components/ui/tabs";

type AvisosBoardProps = {
  workspaceId: string;
  initial: WorkspaceAvisosDTO;
};

function sourceReady(status: WorkspaceAvisosDTO["sources"][0]["status"]) {
  return status === "ok";
}

function hasAnyTarget(data: WorkspaceAvisosDTO): boolean {
  return data.sources.some((source) =>
    source.metrics.some((metric) => metric.hasTarget),
  );
}

function hasAnyConfiguredSource(data: WorkspaceAvisosDTO): boolean {
  return data.sources.some((source) => source.status !== "missing");
}

function defaultChartMetricKey(data: WorkspaceAvisosDTO): WorkspaceMetricKey {
  for (const source of data.sources) {
    for (const metric of source.metrics) {
      if (metric.hasTarget) {
        return metric.key;
      }
    }
  }
  return data.sources[0]?.metrics[0]?.key ?? "vtex_revenue";
}

export function AvisosBoard({ workspaceId, initial }: AvisosBoardProps) {
  const [periodType, setPeriodType] = useState<"week" | "month">(
    initial.periodType,
  );
  const [data, setData] = useState(initial);
  const [chartMetricKey, setChartMetricKey] = useState<WorkspaceMetricKey>(
    () => defaultChartMetricKey(initial),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const chartMetrics = useMemo(
    () => data.sources.flatMap((source) => source.metrics),
    [data],
  );

  const load = useCallback(
    (nextPeriod: "week" | "month") => {
      startTransition(async () => {
        setError(null);
        const result = await getWorkspaceAvisos(workspaceId, nextPeriod);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setData(result.data);
        setChartMetricKey((prev) => {
          const stillExists = result.data.sources.some((source) =>
            source.metrics.some((metric) => metric.key === prev),
          );
          if (stillExists) {
            return prev;
          }
          return defaultChartMetricKey(result.data);
        });
      });
    },
    [workspaceId],
  );

  function handlePeriodChange(value: string) {
    const next = value as "week" | "month";
    setPeriodType(next);
    load(next);
  }

  const showEmpty =
    !pending &&
    !hasAnyTarget(data) &&
    !hasAnyConfiguredSource(data) &&
    !error;

  return (
    <div className="flex w-full flex-col gap-6">
      <Tabs
        value={periodType}
        onValueChange={handlePeriodChange}
        className="w-full gap-4"
      >
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="month" className="flex-1 sm:flex-none">
            Mês
          </TabsTrigger>
          <TabsTrigger value="week" className="flex-1 sm:flex-none">
            Semana
          </TabsTrigger>
        </TabsList>

        <TabsContent value={periodType} className="flex w-full flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            {data.periodLabel}
            {data.collectedAt ? (
              <>
                {" "}
                · Atualizado{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(data.collectedAt))}
              </>
            ) : null}
            {data.snapshotStale ? " · Dados anteriores (coleta falhou)" : null}
          </p>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          {!pending && chartMetrics.length > 0 ? (
            <AvisoMetricChart
              metrics={chartMetrics}
              selectedKey={chartMetricKey}
              onSelectKey={setChartMetricKey}
            />
          ) : null}

          {pending ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : null}

          {showEmpty ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Nenhum aviso configurado</EmptyTitle>
                <EmptyDescription>
                  Conecte VTEX, GA4 ou Google Search na loja e defina metas
                  abaixo para acompanhar se você vai atingir os números no
                  período.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {!pending
            ? data.sources.map((source) => (
                <Card key={source.source}>
                  <CardHeader>
                    <CardTitle>{source.label}</CardTitle>
                    <CardDescription>
                      {source.status === "missing"
                        ? "Credenciais não configuradas"
                        : source.status === "failed"
                          ? "Falha na última coleta"
                          : "Dados do período calendário"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {source.status === "failed" ? (
                      <SourceErrorPanel
                        title={`Não foi possível atualizar ${source.label}`}
                        message={source.error ?? undefined}
                        workspaceId={workspaceId}
                      />
                    ) : null}
                    {source.status === "missing" ? (
                      <SourceErrorPanel
                        title={`${source.label} não configurado`}
                        workspaceId={workspaceId}
                      />
                    ) : null}
                    {source.status === "ok" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {source.metrics.map((metric) => (
                          <AvisoMetricCard
                            key={metric.key}
                            workspaceId={workspaceId}
                            periodType={periodType}
                            metric={metric}
                            sourceReady={sourceReady(source.status)}
                            selected={chartMetricKey === metric.key}
                            onSelect={() => setChartMetricKey(metric.key)}
                            onUpdated={() => load(periodType)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
