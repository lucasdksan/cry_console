import { describe, expect, it } from "vitest";

import {
  computeMetricProjectionRisk,
  computeMetricZoneStatus,
  computePaceStatus,
  computePacedThreshold,
  computeProjection,
} from "@/backend/lib/workspace/alert-status";

describe("computePacedThreshold", () => {
  it("escala acumulador pelo tempo decorrido", () => {
    expect(
      computePacedThreshold({
        metricKey: "vtex_orders",
        threshold: 100,
        elapsedDays: 10,
        totalDays: 20,
      }),
    ).toBe(50);
  });

  it("mantém taxa de conversão no valor total", () => {
    expect(
      computePacedThreshold({
        metricKey: "ga4_conversion_pct",
        threshold: 2,
        elapsedDays: 5,
        totalDays: 30,
      }),
    ).toBe(2);
  });
});

describe("computeMetricZoneStatus", () => {
  it("abaixo do mínimo no ritmo", () => {
    expect(
      computeMetricZoneStatus({
        metricKey: "vtex_orders",
        current: 20,
        minExpected: 80,
        target: 100,
        elapsedDays: 10,
        totalDays: 20,
      }),
    ).toBe("below_min");
  });

  it("dentro da faixa esperada", () => {
    expect(
      computeMetricZoneStatus({
        metricKey: "vtex_orders",
        current: 45,
        minExpected: 80,
        target: 100,
        elapsedDays: 10,
        totalDays: 20,
      }),
    ).toBe("in_band");
  });

  it("no ritmo da meta", () => {
    expect(
      computeMetricZoneStatus({
        metricKey: "vtex_orders",
        current: 55,
        minExpected: 80,
        target: 100,
        elapsedDays: 10,
        totalDays: 20,
      }),
    ).toBe("on_meta_pace");
  });

  it("conversão compara valor atual direto", () => {
    expect(
      computeMetricZoneStatus({
        metricKey: "ga4_conversion_pct",
        current: 1.5,
        minExpected: 1,
        target: 2,
        elapsedDays: 5,
        totalDays: 30,
      }),
    ).toBe("in_band");
    expect(
      computeMetricZoneStatus({
        metricKey: "ga4_conversion_pct",
        current: 2.5,
        minExpected: 1,
        target: 2,
        elapsedDays: 5,
        totalDays: 30,
      }),
    ).toBe("on_meta_pace");
  });
});

describe("computeMetricProjectionRisk", () => {
  it("projeta abaixo do mínimo", () => {
    expect(
      computeMetricProjectionRisk({
        metricKey: "vtex_revenue",
        projection: 50,
        minExpected: 80,
        target: 100,
      }),
    ).toBe("wont_hit_min");
  });

  it("projeta entre mínimo e meta", () => {
    expect(
      computeMetricProjectionRisk({
        metricKey: "vtex_revenue",
        projection: 90,
        minExpected: 80,
        target: 100,
      }),
    ).toBe("wont_hit_meta");
  });

  it("projeta acima da meta", () => {
    expect(
      computeMetricProjectionRisk({
        metricKey: "vtex_revenue",
        projection: 120,
        minExpected: 80,
        target: 100,
      }),
    ).toBe("on_course");
  });
});

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
