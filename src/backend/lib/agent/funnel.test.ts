import { describe, expect, it } from "vitest";

import {
  buildFunnelPartFromVolumes,
  funnelVolumesFromMeasurement,
} from "@/backend/lib/agent/funnel";
import type { AnalysisMeasurementJson } from "@/backend/lib/analysis/types";

describe("agent-funnel", () => {
  it("calcula taxas, perdas e gargalo", () => {
    const part = buildFunnelPartFromVolumes([1000, 200, 100, 50]);
    expect(part.transitions[0]?.passRatePct).toBe(20);
    expect(part.transitions[0]?.dropCount).toBe(800);
    expect(part.bottleneckLabel).toBe("Visualizações → Carrinho");
  });

  it("perda zero quando taxa acima de 100%", () => {
    const part = buildFunnelPartFromVolumes([100, 150, 120, 80]);
    expect(part.transitions[0]?.dropCount).toBe(0);
  });

  it("lê volumes do pilar experiência", () => {
    const measurement = {
      pillars: [
        {
          pillar: "experiencia",
          title: "Experiência",
          available: true,
          status: "Bom",
          metrics: {
            ga4_funnel_views: 5000,
            ga4_funnel_cart: 500,
            ga4_funnel_checkout: 200,
            ga4_funnel_purchase: 100,
          },
          alerts: [],
          data_gaps: [],
        },
      ],
    } as unknown as AnalysisMeasurementJson;
    expect(funnelVolumesFromMeasurement(measurement)).toEqual([
      5000, 500, 200, 100,
    ]);
  });
});
