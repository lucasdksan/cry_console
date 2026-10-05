import { describe, expect, it } from "vitest";

import {
  overallScoreFromPillars,
  scoreFromAlerts,
  statusFromScore,
} from "@/backend/lib/analysis-scoring";

describe("analysis-scoring", () => {
  it("aplica penalidades Iliada finas", () => {
    const score = scoreFromAlerts([
      { id: "a", severity: "critico", message: "x" },
      { id: "b", severity: "atencao", message: "y" },
    ]);
    expect(score).toBe(81);
  });

  it("clamp entre 0 e 100", () => {
    const score = scoreFromAlerts([
      { id: "1", severity: "critico", message: "a" },
      { id: "2", severity: "critico", message: "b" },
      { id: "3", severity: "critico", message: "c" },
      { id: "4", severity: "critico", message: "d" },
      { id: "5", severity: "critico", message: "e" },
      { id: "6", severity: "critico", message: "f" },
      { id: "7", severity: "critico", message: "g" },
    ]);
    expect(score).toBe(0);
  });

  it("mapeia status por faixa", () => {
    expect(statusFromScore(92)).toBe("Excelente");
    expect(statusFromScore(80)).toBe("Bom");
    expect(statusFromScore(65)).toBe("Regular");
    expect(statusFromScore(40)).toBe("Crítico");
  });

  it("média ignora pilares indisponíveis", () => {
    expect(overallScoreFromPillars([80, undefined, 60])).toBe(70);
    expect(overallScoreFromPillars([undefined, undefined])).toBeNull();
  });
});
