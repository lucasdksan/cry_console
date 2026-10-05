import { describe, expect, it } from "vitest";

import type { AnalysisMeasurementJson } from "@/backend/lib/analysis/types";
import {
  assertSanitizedMetrics,
  buildLlmPayloadFromMeasurement,
  collectAllowedTargetMetrics,
} from "@/backend/lib/analysis/sanitize";

const sampleMeasurement: AnalysisMeasurementJson = {
  periodLabel: "Últimos 30 dias",
  periodStart: "2026-01-01T00:00:00.000Z",
  periodEnd: "2026-01-30T23:59:59.999Z",
  collectedAt: "2026-01-30T12:00:00.000Z",
  overallScore: 80,
  overallStatus: "Bom",
  dataGaps: [],
  pillars: [
    {
      pillar: "comercial",
      title: "Como estão as vendas",
      available: true,
      score: 80,
      status: "Bom",
      metrics: { vtex_revenue: 1000, vtex_orders: 10 },
      alerts: [],
      data_gaps: [],
    },
  ],
};

describe("analysis-sanitize", () => {
  it("rejeita chaves PII nos cartões", () => {
    expect(() =>
      assertSanitizedMetrics({ client_email: "x@y.com" }),
    ).toThrow(/proibida/i);
  });

  it("monta payload LLM sem campos extras", () => {
    const json = buildLlmPayloadFromMeasurement(sampleMeasurement);
    expect(json).toContain("vtex_revenue");
    expect(json).not.toContain("client_email");
  });

  it("lista métricas permitidas para target_metric", () => {
    const keys = collectAllowedTargetMetrics(sampleMeasurement);
    expect(keys.has("vtex_revenue")).toBe(true);
    expect(keys.has("vtex_orders")).toBe(true);
  });
});
