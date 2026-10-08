import type { WorkspaceObservabilityDTO } from "@/backend/lib/sentry/observability-dto";

export const AGENT_OBSERVABILITY_NO_WORKSPACE =
  "Observabilidade indisponível: nenhum workspace vinculado a esta sessão.";

export const AGENT_OBSERVABILITY_UNAVAILABLE =
  "Observabilidade indisponível: não foi possível carregar dados do Sentry a tempo.";

const MAX_ISSUES = 8;
const MAX_REPLAYS = 3;
const MAX_URL_LEN = 80;

function truncateUrl(url: string): string {
  if (url.length <= MAX_URL_LEN) {
    return url;
  }
  return `${url.slice(0, MAX_URL_LEN - 1)}…`;
}

function statusLine(dto: WorkspaceObservabilityDTO): string {
  switch (dto.status) {
    case "not_configured":
      return "Observabilidade indisponível: Sentry não está configurado no servidor.";
    case "not_provisioned":
      return "Observabilidade indisponível: loja sem projeto Sentry provisionado (configure padrões de página nas configurações).";
    case "error":
      return `Observabilidade indisponível: ${dto.errorMessage ?? "erro ao carregar dados do Sentry."}`;
    case "ok":
      return "";
  }
}

export function buildObservabilityPromptSection(
  dto: WorkspaceObservabilityDTO,
): string {
  const unavailable = statusLine(dto);
  if (unavailable) {
    return unavailable;
  }

  const lines: string[] = [
    `Fonte: Sentry. Período: ${dto.periodLabel}. Páginas: ${dto.pageFilterLabel}.`,
    "Não invente issues, contagens, usuários afetados nem p75 de Web Vitals — use somente os dados abaixo.",
  ];

  const issues = dto.issues.slice(0, MAX_ISSUES);
  if (issues.length === 0) {
    lines.push("Issues: nenhuma issue não resolvida no período.");
  } else {
    lines.push(`Issues (${issues.length}${dto.issues.length > MAX_ISSUES ? ` de ${dto.issues.length}` : ""}):`);
    for (const issue of issues) {
      const users =
        issue.userCount !== null ? `, ${issue.userCount} usuários` : "";
      const where = issue.where ? ` Onde: ${issue.where}.` : "";
      const code = issue.codeLine ? ` Trecho: ${issue.codeLine}.` : "";
      lines.push(
        `- [${issue.severityLabel}] ${issue.title} — ${issue.count} eventos${users}, último visto ${issue.lastSeen}. ${issue.summary} Sugestão: ${issue.suggestion}.${where}${code}`,
      );
    }
  }

  if (dto.vitalsGroups.length === 0) {
    lines.push("Web Vitals: sem amostras no período.");
  } else {
    lines.push("Web Vitals:");
    for (const group of dto.vitalsGroups) {
      const poor = group.vitals.filter((v) => v.severity !== "ok");
      if (poor.length === 0) {
        lines.push(`- ${group.pageTypeLabel}: ${group.summary}`);
        continue;
      }
      const metrics = poor
        .map(
          (v) =>
            `${v.label} ${v.displayValue ?? "—"} (${v.severityLabel}) — ${v.advice}`,
        )
        .join("; ");
      lines.push(
        `- ${group.pageTypeLabel}: ${group.summary} Métricas fora do ok: ${metrics}.`,
      );
    }
  }

  const replays = dto.replays.slice(0, MAX_REPLAYS);
  if (replays.length === 0) {
    lines.push("Replays: nenhum replay recente.");
  } else {
    lines.push(
      `Replays (${dto.replays.length} no total, mostrando ${replays.length}):`,
    );
    for (const replay of replays) {
      const urls =
        replay.urls.length > 0
          ? replay.urls.map(truncateUrl).join(", ")
          : "—";
      lines.push(
        `- ${replay.summary} Navegador: ${replay.browser ?? "—"}. Erros: ${replay.errorCount}. URLs: ${urls}.`,
      );
    }
  }

  return lines.join("\n");
}
