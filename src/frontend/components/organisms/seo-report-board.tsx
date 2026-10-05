"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

import {
  getWorkspacePageAudit,
  runWorkspacePageAudit,
} from "@/backend/controllers/page-audit.controller";
import type { WorkspacePageAuditDTO } from "@/backend/lib/page-audit/types";
import { PageAuditFindingsList } from "@/frontend/components/molecules/page-audit-findings-list";
import { PageAuditNarrativeCard } from "@/frontend/components/molecules/page-audit-narrative-card";
import { PageAuditScoreStrip } from "@/frontend/components/molecules/page-audit-score-strip";
import { PageAuditVitalsStrip } from "@/frontend/components/molecules/page-audit-vitals-strip";
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

type SeoReportBoardProps = {
  workspaceId: string;
  siteUrl: string;
  initial: WorkspacePageAuditDTO | null;
};

export function SeoReportBoard({ workspaceId, siteUrl, initial }: SeoReportBoardProps) {
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
              Padrão: página inicial ({siteUrl}). Caminho opcional, ex. /p/sku
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="seo-path">Caminho (opcional)</Label>
              <Input
                id="seo-path"
                placeholder="/"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                disabled={pending}
              />
            </div>
            <Button type="button" disabled={pending} onClick={() => run(false)}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Gerar relatório SEO
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
              Gere o relatório para analisar HTML servido, PageSpeed mobile e sinais GSC
              já salvos na análise da loja.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const { report } = data;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">URL auditada</CardTitle>
          <CardDescription className="break-all">{data.url}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="seo-path">Caminho (opcional)</Label>
            <Input
              id="seo-path"
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
        label="Saúde SEO"
        score={report.seo.healthScore}
        subtitle={`${report.seo.summary.high} alta · ${report.seo.summary.medium} média`}
      />

      <PageAuditVitalsStrip pagespeed={report.pagespeed} />

      {report.storeContext ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contexto da loja (GSC)</CardTitle>
            <CardDescription>Dados da última análise — não recolhidos nesta execução.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Cliques</p>
              <p className="font-medium tabular-nums">{report.storeContext.gscClicks ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CTR %</p>
              <p className="font-medium tabular-nums">
                {report.storeContext.gscCtrPct ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Posição</p>
              <p className="font-medium tabular-nums">
                {report.storeContext.gscPosition ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <PageAuditFindingsList findings={report.seo.findings} />

      <PageAuditNarrativeCard
        narrative={data.narrative}
        variant="seo"
        narrativeError={data.narrativeError}
      />
    </div>
  );
}
