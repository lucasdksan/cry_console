import { describe, expect, it } from "vitest";

import {
  computePaceStatus,
  computeProjection,
} from "@/backend/lib/workspace/alert-status";

describe("computePaceStatus", () => {
  it("acumulado no ritmo quando atual >= meta proporcional", () => {
    expect(
      computePaceStatus({
        metricKey: "vtex_orders",
        current: 50,
        target: 100,
        elapsedDays: 10,
        totalDays: 20,
      }),
    ).toBe("on_track");
  });

  it("acumulado off_track quando abaixo do ritmo e projeção não atinge meta", () => {
    expect(
      computePaceStatus({
        metricKey: "ga4_sessions",
        current: 10,
        target: 100,
        elapsedDays: 10,
        totalDays: 20,
      }),
    ).toBe("off_track");
  });

  it("taxa de conversão compara direto com a meta", () => {
    expect(
      computePaceStatus({
        metricKey: "ga4_conversion_pct",
        current: 2.5,
        target: 2,
        elapsedDays: 5,
        totalDays: 30,
      }),
    ).toBe("on_track");
    expect(
      computePaceStatus({
        metricKey: "ga4_conversion_pct",
        current: 1.5,
        target: 2,
        elapsedDays: 5,
        totalDays: 30,
      }),
    ).toBe("off_track");
  });
});

describe("computeProjection", () => {
  it("projeta acumulado linearmente", () => {
    expect(
      computeProjection("vtex_revenue", 50, 10, 20),
    ).toBe(100);
  });
});
