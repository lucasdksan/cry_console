import type {
  AnalysisAlert,
  AnalysisAlertSeverity,
  AnalysisPillarStatus,
} from "@/backend/lib/analysis/types";

const PENALTY: Record<AnalysisAlertSeverity, number> = {
  critico: 15,
  alerta: 8,
  atencao: 4,
};

export function scoreFromAlerts(alerts: AnalysisAlert[]): number {
  let score = 100;
  for (const alert of alerts) {
    score -= PENALTY[alert.severity] ?? 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function statusFromScore(score: number): AnalysisPillarStatus {
  if (score >= 90) {
    return "Excelente";
  }
  if (score >= 75) {
    return "Bom";
  }
  if (score >= 60) {
    return "Regular";
  }
  return "Crítico";
}

export function overallScoreFromPillars(
  scores: Array<number | undefined>,
): number | null {
  const valid = scores.filter((s): s is number => typeof s === "number");
  if (valid.length === 0) {
    return null;
  }
  const sum = valid.reduce((acc, n) => acc + n, 0);
  return Math.round(sum / valid.length);
}

export function overallStatusFromScore(
  score: number | null,
): AnalysisPillarStatus | "Indisponível" {
  if (score === null) {
    return "Indisponível";
  }
  return statusFromScore(score);
}
