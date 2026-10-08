import type { VitalRating } from "@/backend/lib/sentry/insights";

export const OBSERVABILITY_ALERT_SEVERITIES = [
  "critico",
  "alerta",
  "atencao",
  "ok",
] as const;

export type ObservabilityAlertSeverity =
  (typeof OBSERVABILITY_ALERT_SEVERITIES)[number];

const SEVERITY_LABELS: Record<ObservabilityAlertSeverity, string> = {
  critico: "Crítico",
  alerta: "Alerta",
  atencao: "Atenção",
  ok: "Ok",
};

export function observabilitySeverityLabel(
  severity: ObservabilityAlertSeverity,
): string {
  return SEVERITY_LABELS[severity];
}

function hoursSince(iso: string, now = Date.now()): number | null {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) {
    return null;
  }
  return (now - t) / (1000 * 60 * 60);
}

export function rateIssueSeverity(input: {
  level: string;
  count: number;
  lastSeen: string;
}): ObservabilityAlertSeverity {
  const level = input.level.toLowerCase();
  const recent = hoursSince(input.lastSeen);
  const isRecent = recent !== null && recent <= 24;

  if (level === "fatal") {
    return "critico";
  }
  if (level === "error") {
    if (input.count >= 10 || (isRecent && input.count >= 3)) {
      return "critico";
    }
    return "alerta";
  }
  if (level === "warning") {
    return "atencao";
  }
  return "ok";
}

export function vitalRatingToSeverity(
  rating: VitalRating | null,
): ObservabilityAlertSeverity {
  if (rating === "poor") {
    return "critico";
  }
  if (rating === "needs-improvement") {
    return "atencao";
  }
  if (rating === "good") {
    return "ok";
  }
  return "atencao";
}

export function buildVitalAdvice(input: {
  label: string;
  rating: VitalRating | null;
  displayValue: string | null;
}): string {
  if (input.rating === null || !input.displayValue) {
    return `${input.label}: ainda não há amostra suficiente no período (transações amostradas ~10%).`;
  }
  if (input.rating === "poor") {
    return `${input.label} em ${input.displayValue} — acima do limite recomendado; impacta conversão e SEO.`;
  }
  if (input.rating === "needs-improvement") {
    return `${input.label} em ${input.displayValue} — margem apertada; otimize carregamento e interação.`;
  }
  return `${input.label} em ${input.displayValue} — dentro do esperado.`;
}

export function rateVitalsGroupSeverity(
  vitals: Array<{ rating: VitalRating | null }>,
): ObservabilityAlertSeverity {
  let worst: ObservabilityAlertSeverity = "ok";
  let hasSample = false;
  for (const vital of vitals) {
    if (vital.rating !== null) {
      hasSample = true;
    }
    const s = vitalRatingToSeverity(vital.rating);
    if (severityRank(s) > severityRank(worst)) {
      worst = s;
    }
  }
  if (!hasSample) {
    return "atencao";
  }
  return worst;
}

function severityRank(severity: ObservabilityAlertSeverity): number {
  switch (severity) {
    case "critico":
      return 3;
    case "alerta":
      return 2;
    case "atencao":
      return 1;
    default:
      return 0;
  }
}

export function buildVitalsGroupSummary(input: {
  pageTypeLabel: string;
  severity: ObservabilityAlertSeverity;
  vitals: Array<{ label: string; rating: VitalRating | null }>;
}): string {
  const poor = input.vitals.filter((v) => v.rating === "poor").map((v) => v.label);
  const watch = input.vitals
    .filter((v) => v.rating === "needs-improvement")
    .map((v) => v.label);

  if (input.severity === "ok") {
    return `Performance da ${input.pageTypeLabel} está estável no período.`;
  }
  if (poor.length > 0) {
    return `Performance crítica na ${input.pageTypeLabel}: ${poor.join(", ")} precisam de ação imediata.`;
  }
  if (watch.length > 0) {
    return `Performance da ${input.pageTypeLabel} em atenção (${watch.join(", ")}).`;
  }
  return `Poucos dados de performance para ${input.pageTypeLabel} neste período.`;
}

export function rateReplaySeverity(errorCount: number): ObservabilityAlertSeverity {
  if (errorCount >= 3) {
    return "critico";
  }
  if (errorCount >= 1) {
    return "alerta";
  }
  return "ok";
}

export function buildReplaySummary(input: {
  errorCount: number;
  browser: string | null;
  url: string | null;
  severity: ObservabilityAlertSeverity;
}): string {
  const where = input.url ? ` em ${trimUrlForDisplay(input.url)}` : "";
  const browser = input.browser ? ` (${input.browser})` : "";

  if (input.severity === "critico") {
    return `Sessão${browser} com ${input.errorCount} erros${where}. Experiência fortemente prejudicada.`;
  }
  if (input.severity === "alerta") {
    return `Sessão${browser} encontrou ${input.errorCount} erro(s)${where}. Usuário pode ter abandonado o fluxo.`;
  }
  return `Sessão amostrada${browser}${where} — sem erros registrados nesta gravação.`;
}

function trimUrlForDisplay(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 40 ? `${u.pathname.slice(0, 37)}…` : u.pathname;
    return path || u.hostname;
  } catch {
    return url.length > 48 ? `${url.slice(0, 45)}…` : url;
  }
}
