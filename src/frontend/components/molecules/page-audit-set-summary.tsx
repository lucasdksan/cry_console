import type { WorkspacePageAuditSetDTO } from "@/backend/lib/page-audit/types";
import { PageAuditScoreStrip } from "@/frontend/components/molecules/page-audit-score-strip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

type PageAuditSetSummaryProps = {
  summary: WorkspacePageAuditSetDTO["summary"];
  measuredCount: number;
};

export function PageAuditSetSummary({ summary, measuredCount }: PageAuditSetSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumo da loja</CardTitle>
        <CardDescription>
          Média de {measuredCount} URL{measuredCount === 1 ? "" : "s"} medida
          {measuredCount === 1 ? "" : "s"} neste conjunto.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PageAuditScoreStrip
          label="Saúde SEO (média)"
          score={summary.seoHealthScore}
          subtitle={summary.seoHealthScore == null ? "Nenhuma URL medida ainda" : undefined}
        />
        <PageAuditScoreStrip
          label="Experiência CRO (média)"
          score={summary.croExperienceScore}
          subtitle={summary.croExperienceScore == null ? "Nenhuma URL medida ainda" : undefined}
        />
      </CardContent>
    </Card>
  );
}
