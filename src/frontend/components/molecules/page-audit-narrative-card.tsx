import type { PageAuditNarrativeJson } from "@/backend/lib/page-audit/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";

type PageAuditNarrativeCardProps = {
  narrative: PageAuditNarrativeJson | null;
  variant: "seo" | "cro";
  narrativeError?: string;
};

export function PageAuditNarrativeCard({
  narrative,
  variant,
  narrativeError,
}: PageAuditNarrativeCardProps) {
  const priorities =
    variant === "seo" ? narrative?.seoPriorities : narrative?.croPriorities;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resumo com IA</CardTitle>
        <CardDescription>
          {narrative
            ? `Confiança: ${narrative.confidence}`
            : narrativeError ?? "Narrativa indisponível."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {narrative?.summary ? <p>{narrative.summary}</p> : null}
        {priorities && priorities.length > 0 ? (
          <div>
            <p className="mb-2 font-medium">Prioridades</p>
            <ul className="list-disc space-y-1 pl-5">
              {priorities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
