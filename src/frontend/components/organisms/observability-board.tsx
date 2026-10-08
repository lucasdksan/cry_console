"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { loadObservabilityIssueAnalyses } from "@/backend/controllers/observability.controller";
import {
  OBSERVABILITY_ISSUE_ANALYSIS_LIMIT,
  type ObservabilityIssueAnalysisDTO,
  type WorkspaceObservabilityDTO,
} from "@/backend/lib/sentry/observability-dto";
import { ObservabilityFilters } from "@/frontend/components/molecules/observability-filters";
import { ObservabilityIssueCard } from "@/frontend/components/molecules/observability-issue-card";
import { ObservabilitySeverityBadge } from "@/frontend/components/molecules/observability-severity-badge";
import { SourceErrorPanel } from "@/frontend/components/molecules/source-error-panel";
import { Alert, AlertDescription, AlertTitle } from "@/frontend/components/ui/alert";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/frontend/components/ui/tabs";

type ObservabilityBoardProps = {
  workspaceId: string;
  data: WorkspaceObservabilityDTO;
};

function formatLastSeen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatIssueMeta(issue: WorkspaceObservabilityDTO["issues"][number]): string {
  const parts = [
    `${issue.count} ocorrência${issue.count === 1 ? "" : "s"}`,
  ];
  if (issue.userCount !== null && issue.userCount > 0) {
    parts.push(
      `${issue.userCount} visitante${issue.userCount === 1 ? "" : "s"}`,
    );
  }
  parts.push(`última ${formatLastSeen(issue.lastSeen)}`);
  if (issue.unhandled) {
    parts.push("não tratado");
  }
  return parts.join(" · ");
}

function formatDurationMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms >= 60_000) {
    return `${Math.round(ms / 60_000)} min`;
  }
  return `${Math.round(ms / 1000)} s`;
}

type ObservabilityTab = "avisos" | "vitals" | "sessoes";

export function ObservabilityBoard({ workspaceId, data }: ObservabilityBoardProps) {
  const [activeTab, setActiveTab] = useState<ObservabilityTab>("avisos");
  const [loadedAnalysisKey, setLoadedAnalysisKey] = useState<string | null>(
    null,
  );
  const [analyses, setAnalyses] = useState<
    Record<string, ObservabilityIssueAnalysisDTO>
  >({});
  const analysisKey = data.issues
    .slice(0, OBSERVABILITY_ISSUE_ANALYSIS_LIMIT)
    .map((issue) => issue.id)
    .join(",");
  const shouldLoadAnalyses =
    data.status === "ok" && analysisKey.length > 0;
  const analysisPending =
    shouldLoadAnalyses && loadedAnalysisKey !== analysisKey;
  const visibleAnalyses =
    loadedAnalysisKey === analysisKey ? analyses : {};

  useEffect(() => {
    const issueIds = analysisKey ? analysisKey.split(",") : [];
    if (!shouldLoadAnalyses) {
      return;
    }

    let cancelled = false;
    void loadObservabilityIssueAnalyses(workspaceId, issueIds)
      .then((result) => {
        if (!cancelled) {
          setAnalyses(result);
          setLoadedAnalysisKey(analysisKey);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAnalyses({});
          setLoadedAnalysisKey(analysisKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [analysisKey, shouldLoadAnalyses, workspaceId]);

  const filtersDisabled =
    data.status === "not_provisioned" ||
    data.status === "not_configured" ||
    data.status === "error";

  return (
    <div className="flex flex-col gap-6">
      <ObservabilityFilters
        period={data.period}
        pageFilter={data.pageFilter}
        disabled={filtersDisabled}
      />

      {data.status === "not_configured" ? (
        <SourceErrorPanel
          title="Observabilidade indisponível"
          message={
            data.errorMessage ??
            "Peça ao administrador da conta para concluir a configuração."
          }
          workspaceId={workspaceId}
        />
      ) : null}

      {data.status === "error" ? (
        <SourceErrorPanel
          title="Não foi possível carregar os avisos"
          message={data.errorMessage}
          workspaceId={workspaceId}
        />
      ) : null}

      {data.status === "not_provisioned" ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Observabilidade não ativa</EmptyTitle>
            <EmptyDescription>
              Configure padrões de página em Configurações para começar a
              receber avisos de erros, performance e sessões.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            className="rounded-[var(--radius-md)]"
            render={<Link href={`/lojas/${workspaceId}`} />}
          >
            Ir para Configurações
          </Button>
        </Empty>
      ) : null}

      {data.status === "ok" ? (
        <>
          <p className="text-xs text-muted-foreground">
            {data.periodLabel} · filtro {data.pageFilterLabel}
            {data.fetchedAt
              ? ` · atualizado ${formatLastSeen(data.fetchedAt)}`
              : null}
            {" · "}
            Performance amostrada (~10% das visitas); sessões gravadas em
            amostra (~5%).
          </p>

          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (value === "avisos" || value === "vitals" || value === "sessoes") {
                setActiveTab(value);
              }
            }}
            className="flex w-full flex-col gap-4"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="avisos">Avisos</TabsTrigger>
              <TabsTrigger value="vitals">Performance</TabsTrigger>
              <TabsTrigger value="sessoes">Sessões</TabsTrigger>
            </TabsList>

            <TabsContent value="avisos" className="flex flex-col gap-3">
              {data.issues.length === 0 ? (
                <Empty className="border border-dashed py-8">
                  <EmptyHeader>
                    <EmptyTitle>Nenhum aviso aberto</EmptyTitle>
                    <EmptyDescription>
                      Não há falhas em aberto neste período. Quando algo
                      quebrar no site monitorado, a gravidade aparecerá aqui.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                data.issues.map((issue, index) => (
                  <ObservabilityIssueCard
                    key={issue.id}
                    issue={issue}
                    analysis={visibleAnalyses[issue.id] ?? null}
                    analysisPending={
                      analysisPending && index < OBSERVABILITY_ISSUE_ANALYSIS_LIMIT
                    }
                    meta={formatIssueMeta(issue)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="vitals" className="flex flex-col gap-4">
              {data.vitalsGroups.length === 0 ? (
                <Empty className="border border-dashed py-8">
                  <EmptyHeader>
                    <EmptyTitle>Sem dados de performance</EmptyTitle>
                    <EmptyDescription>
                      Gere tráfego nas páginas monitoradas (home, PLP, PDP)
                      para calcular Web Vitals.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                data.vitalsGroups.map((group) => (
                  <Card key={group.pageTypeLabel}>
                    <CardHeader className="gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">
                          {group.pageTypeLabel}
                        </CardTitle>
                        <ObservabilitySeverityBadge
                          severity={group.severity}
                          label={group.severityLabel}
                        />
                      </div>
                      <CardDescription>{group.summary}</CardDescription>
                      {group.transactionCount !== null ? (
                        <CardDescription>
                          {group.transactionCount} visita(s) amostradas no
                          período
                        </CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      {group.vitals.map((vital) => (
                        <div
                          key={vital.key}
                          className="flex flex-col gap-2 rounded-[var(--radius-md)] border p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {vital.label}
                            </span>
                            <ObservabilitySeverityBadge
                              severity={vital.severity}
                              label={vital.severityLabel}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {vital.advice}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="sessoes" className="flex flex-col gap-3">
              {data.replays.length === 0 ? (
                <Empty className="border border-dashed py-8">
                  <EmptyHeader>
                    <EmptyTitle>Nenhuma sessão amostrada</EmptyTitle>
                    <EmptyDescription>
                      Sessões entram em amostra aos poucos. Erros na loja
                      aumentam a chance de aparecer aqui.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                data.replays.map((replay) => (
                  <Card key={replay.id}>
                    <CardHeader className="gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">
                          Sessão · {formatLastSeen(replay.startedAt)}
                        </CardTitle>
                        <ObservabilitySeverityBadge
                          severity={replay.severity}
                          label={replay.severityLabel}
                        />
                      </div>
                      <CardDescription>
                        Duração {formatDurationMs(replay.durationMs)}
                        {replay.browser ? ` · ${replay.browser}` : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <Alert>
                        <AlertTitle className="text-sm">O que aconteceu</AlertTitle>
                        <AlertDescription>{replay.summary}</AlertDescription>
                      </Alert>
                      {replay.urls.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Página: {replay.urls[0]}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}
