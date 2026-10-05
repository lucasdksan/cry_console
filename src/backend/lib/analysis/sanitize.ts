import type {
  AnalysisMeasurementJson,
  AnalysisPillarCard,
} from "@/backend/lib/analysis/types";

const FORBIDDEN_KEYS = new Set([
  "email",
  "clientemail",
  "client_email",
  "orderid",
  "order_id",
  "userid",
  "user_id",
  "token",
  "password",
  "gaclientemail",
  "ga_client_email",
]);

function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEYS.has(key.toLowerCase());
}

export function assertSanitizedMetrics(
  metrics: Record<string, number | string | null>,
): void {
  for (const key of Object.keys(metrics)) {
    if (isForbiddenKey(key)) {
      throw new Error(`Chave proibida no cartão: ${key}`);
    }
  }
}

export function buildLlmPayloadFromMeasurement(
  measurement: AnalysisMeasurementJson,
): string {
  const payload = {
    periodLabel: measurement.periodLabel,
    overallScore: measurement.overallScore,
    overallStatus: measurement.overallStatus,
    dataGaps: measurement.dataGaps,
    pillars: measurement.pillars.map((p) => sanitizePillarForLlm(p)),
  };
  return JSON.stringify(payload, null, 2);
}

function sanitizePillarForLlm(pillar: AnalysisPillarCard) {
  assertSanitizedMetrics(pillar.metrics);
  return {
    pillar: pillar.pillar,
    title: pillar.title,
    available: pillar.available,
    score: pillar.score,
    status: pillar.status,
    metrics: pillar.metrics,
    alerts: pillar.alerts.map((a) => ({
      id: a.id,
      severity: a.severity,
      message: a.message,
    })),
    data_gaps: pillar.data_gaps,
  };
}

export function collectAllowedTargetMetrics(
  measurement: AnalysisMeasurementJson,
): Set<string> {
  const keys = new Set<string>();
  for (const pillar of measurement.pillars) {
    for (const key of Object.keys(pillar.metrics)) {
      keys.add(key);
    }
  }
  return keys;
}
