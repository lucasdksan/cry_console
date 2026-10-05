"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

import {
  getWorkspacePageAudit,
  runWorkspacePageAudit,
} from "@/backend/controllers/page-audit.controller";
import type { WorkspacePageAuditDTO } from "@/backend/lib/page-audit/types";
import { PageAuditCroAxes } from "@/frontend/components/molecules/page-audit-cro-axes";
import { PageAuditNarrativeCard } from "@/frontend/components/molecules/page-audit-narrative-card";
import { PageAuditScoreStrip } from "@/frontend/components/molecules/page-audit-score-strip";
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
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";

type CroReportBoardProps = {
  workspaceId: string;
  siteUrl: string;
  initial: WorkspacePageAuditDTO | null;
};

function experienceScore100(experienceScore: number): number {
  const normalized = Math.max(0, Math.min(1, (experienceScore + 1) / 2));
  return Math.round(normalized * 100);
}

export function CroReportBoard({ workspaceId, siteUrl, initial }: CroReportBoardProps) {
  const [data, setData] = useState<WorkspacePageAuditDTO | null>(initial);
  const [path, setPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    (force: boolean) => {
      startTransition(async () => {
        setError(null);
        const result = await runWorkspacePageAudit(workspaceId, {
          path: path.trim() || undefined,
          force,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setData(result.data);
      });
    },
    [path, workspaceId],
  );

  const refresh = useCallback(async () => {
    const loaded = await getWorkspacePageAudit(workspaceId);
    if (loaded.ok) {
      setData(loaded.data);
    }
  }, [workspaceId]);

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">URL auditada</CardTitle>
            <CardDescription>
              Padrão: página inicial ({siteUrl}). Caminho opcional, ex. /checkout
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cro-path">Caminho (opcional)</Label>
              <Input
                id="cro-path"
                placeholder="/"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                disabled={pending}
              />
            </div>
            <Button type="button" disabled={pending} onClick={() => run(false)}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Gerar relatório CRO
            </Button>
          </CardContent>
        </Card>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nenhuma auditoria ainda</EmptyTitle>
            <EmptyDescription>
              Gere o relatório para ver eixos de conversão, jornada heurística e funil/Clarity
              da análise da loja.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const { report } = data;
  const cro = report.cro;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">URL auditada</CardTitle>
          <CardDescription className="break-all">{data.url}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cro-path">Caminho (opcional)</Label>
            <Input
              id="cro-path"
              placeholder="/"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={() => run(false)}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {data.cacheFresh ? "Usar cache (24h)" : "Gerar"}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => run(true)}>
              Atualizar agora
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => void refresh()}>
              Recarregar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{report.disclaimer}</p>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <PageAuditScoreStrip
        label="Experiência modelada"
        score={experienceScore100(cro.experienceScore)}
        subtitle={cro.laymanSummary.overview.slice(0, 120)}
      />

      <PageAuditCroAxes cro={cro} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jornada</CardTitle>
          <CardDescription>Valor menos custo por etapa (modelo heurístico).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {cro.journey.map((step) => (
            <div
              key={step.stage}
              className="flex flex-col gap-1 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm font-medium">{step.label}</span>
              <span className="text-sm tabular-nums text-muted-foreground">
                valor {step.value.toFixed(2)} · custo {step.cost.toFixed(2)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {cro.diagnosticFlags.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sinais</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {cro.laymanSummary.insights.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {report.storeContext ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contexto da loja</CardTitle>
            <CardDescription>Funil GA4 e Clarity da última análise.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Checkout → compra %</p>
              <p className="font-medium tabular-nums">
                {report.storeContext.funnelCheckoutToPurchasePct ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Dead clicks Clarity %</p>
              <p className="font-medium tabular-nums">
                {report.storeContext.clarityDeadClickRate ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <PageAuditNarrativeCard
        narrative={data.narrative}
        variant="cro"
        narrativeError={data.narrativeError}
      />
    </div>
  );
}
