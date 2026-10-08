import type {
  ObservabilityIssueAnalysisDTO,
  ObservabilityIssueAvisoDTO,
} from "@/backend/lib/sentry/observability-dto";
import { ObservabilitySeverityBadge } from "@/frontend/components/molecules/observability-severity-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

type ObservabilityIssueCardProps = {
  issue: ObservabilityIssueAvisoDTO;
  analysis: ObservabilityIssueAnalysisDTO | null;
  analysisPending: boolean;
  meta: string;
};

export function ObservabilityIssueCard({
  issue,
  analysis,
  analysisPending,
  meta,
}: ObservabilityIssueCardProps) {
  const narrative =
    analysis?.whatHappened ??
    (issue.summary !== issue.title ? issue.summary : null);
  const steps = analysis?.steps ?? [];
  const fixText =
    analysis?.suggestion ?? (steps.length > 0 ? null : issue.suggestion);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{issue.title}</CardTitle>
          <ObservabilitySeverityBadge
            severity={issue.severity}
            label={issue.severityLabel}
          />
        </div>
        <CardDescription>{meta}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {narrative ? (
          <section className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">O que aconteceu</h3>
            <p className="text-sm text-muted-foreground">{narrative}</p>
          </section>
        ) : null}

        {issue.where ? (
          <section className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">Onde</h3>
            <p className="text-sm text-muted-foreground">{issue.where}</p>
            {issue.codeLine ? (
              <pre className="overflow-x-auto rounded-[var(--radius-md)] bg-muted px-3 py-2 font-mono text-xs text-foreground">
                {issue.codeLine}
              </pre>
            ) : null}
          </section>
        ) : null}

        {analysis?.possibleCause ? (
          <section className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">Causa provável</h3>
            <p className="text-sm text-muted-foreground">
              {analysis.possibleCause}
            </p>
          </section>
        ) : null}

        <section className="flex flex-col gap-2 rounded-[var(--radius-md)] border p-3">
          <h3 className="text-sm font-medium">Como corrigir</h3>
          {fixText ? (
            <p className="text-sm text-muted-foreground">{fixText}</p>
          ) : null}
          {steps.length > 0 ? (
            <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
              {steps.map((step, index) => (
                <li key={`${step.title}-${index}`}>
                  <span className="font-medium text-foreground">{step.title}</span>
                  {step.detail && step.detail !== step.title
                    ? ` — ${step.detail}`
                    : null}
                </li>
              ))}
            </ol>
          ) : null}
          {analysisPending ? (
            <p className="text-xs text-muted-foreground">
              Buscando causa e sugestão de correção…
            </p>
          ) : null}
        </section>

        {issue.stackLines.length > 1 ? (
          <section className="flex flex-col gap-1">
            <h3 className="text-xs font-medium text-muted-foreground">
              Pilha
            </h3>
            <ul className="font-mono text-xs text-muted-foreground">
              {issue.stackLines.map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
