import type { SeoFinding } from "@/backend/lib/page-audit/types";
import { Badge } from "@/frontend/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

const SEVERITY_LABEL: Record<SeoFinding["severity"], string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  info: "Info",
};

function severityVariant(
  severity: SeoFinding["severity"],
): "default" | "secondary" | "destructive" | "outline" {
  if (severity === "high") return "destructive";
  if (severity === "medium") return "secondary";
  return "outline";
}

type PageAuditFindingsListProps = {
  findings: SeoFinding[];
};

export function PageAuditFindingsList({ findings }: PageAuditFindingsListProps) {
  if (findings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Achados</CardTitle>
          <CardDescription>Nenhum problema detectado nesta execução.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Achados</CardTitle>
        <CardDescription>Priorize correções de impacto alto primeiro.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {findings.map((f) => (
          <article key={f.id} className="flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={severityVariant(f.severity)}>{SEVERITY_LABEL[f.severity]}</Badge>
              <span className="text-sm font-medium">{f.title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{f.whyItMatters}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {f.howToFix.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
