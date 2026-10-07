import type { PageAuditRoleReport } from "@/backend/lib/page-audit/types";
import { PageAuditCroAxes } from "@/frontend/components/molecules/page-audit-cro-axes";
import { PageAuditFindingsList } from "@/frontend/components/molecules/page-audit-findings-list";
import { PageAuditNarrativeCard } from "@/frontend/components/molecules/page-audit-narrative-card";
import { PageAuditScoreStrip } from "@/frontend/components/molecules/page-audit-score-strip";
import { PageAuditVitalsStrip } from "@/frontend/components/molecules/page-audit-vitals-strip";
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

type PageAuditRoleReportProps = {
  roleReport: PageAuditRoleReport;
  variant: "seo" | "cro";
};

export function PageAuditRoleReportPanel({ roleReport, variant }: PageAuditRoleReportProps) {
  if (!roleReport.report) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{roleReport.label} não medida</EmptyTitle>
          <EmptyDescription>
            Informe o caminho e gere o conjunto para incluir esta URL na auditoria.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const { report } = roleReport;

  if (variant === "cro") {
    const cro = report.cro;
    const exp100 = Math.round(((cro.experienceScore + 1) / 2) * 100);
    return (
      <div className="flex flex-col gap-4">
        {roleReport.url ? (
          <p className="break-all text-xs text-muted-foreground">{roleReport.url}</p>
        ) : null}
        <PageAuditScoreStrip
          label="Experiência modelada"
          score={exp100}
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
        {cro.laymanSummary.insights.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sinais</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                {cro.laymanSummary.insights.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
        <PageAuditNarrativeCard
          narrative={roleReport.narrative}
          variant="cro"
          narrativeError={roleReport.narrativeError}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {roleReport.url ? (
        <p className="break-all text-xs text-muted-foreground">{roleReport.url}</p>
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
              <p className="font-medium tabular-nums">{report.storeContext.gscCtrPct ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Posição</p>
              <p className="font-medium tabular-nums">{report.storeContext.gscPosition ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <PageAuditFindingsList findings={report.seo.findings} />
      <PageAuditNarrativeCard
        narrative={roleReport.narrative}
        variant="seo"
        narrativeError={roleReport.narrativeError}
      />
    </div>
  );
}
