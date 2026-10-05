import { describe, expect, it } from "vitest";

import { buildAnalysisMeasurement } from "@/backend/lib/analysis-heuristics";
import { lastNDaysPeriod } from "@/backend/lib/overview-period";

describe("buildAnalysisMeasurement", () => {
  it("penaliza cancelamento comercial alto", () => {
    const period = lastNDaysPeriod(30);
    const measurement = buildAnalysisMeasurement({
      period,
      collectedAt: new Date().toISOString(),
      vtexConfigured: true,
      gaConfigured: false,
      gscConfigured: false,
      clarityConfigured: false,
      vtexOk: true,
      gaOk: false,
      gscOk: false,
      clarityOk: false,
      vtexMetrics: {
        order_count: 100,
        revenue: 50000,
        canceled: 25,
      },
      analytics: null,
      searchConsole: null,
      clarity: null,
      metricDays: [],
    });

    const comercial = measurement.pillars.find((p) => p.pillar === "comercial");
    expect(comercial?.score).toBeLessThan(100);
    expect(comercial?.alerts.some((a) => a.id === "comercial_cancel_critico")).toBe(
      true,
    );
  });
});
