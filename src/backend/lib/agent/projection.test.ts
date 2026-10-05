import { describe, expect, it } from "vitest";

import {
  buildProjectionPart,
  sampleMean,
  sampleStdDev,
} from "@/backend/lib/agent/projection";
import type { MetricDayRow } from "@/backend/models/workspace-metric.model";

describe("agent-projection", () => {
  const period = {
    start: "2026-10-01T00:00:00.000-03:00",
    end: "2026-10-31T23:59:59.999-03:00",
    collectEnd: "2026-10-05T23:59:59.999-03:00",
    label: "Mês",
    periodStart: new Date(),
    periodEnd: new Date(),
    capturedOn: new Date(),
    totalDays: 31,
    elapsedDays: 5,
  };

  it("calcula média e desvio amostral", () => {
    expect(sampleMean([2, 4, 6])).toBe(4);
    expect(sampleStdDev([2, 4, 6])!).toBeCloseTo(2, 5);
    expect(sampleStdDev([5])).toBeNull();
  });

  it("marca dias fora da faixa e projeta total do mês", () => {
    const days: MetricDayRow[] = [1, 2, 3, 4, 5].map((d) => ({
      id: String(d),
      workspaceId: "w",
      calendarDay: new Date(`2026-10-0${d}T00:00:00.000Z`),
      collectedAt: new Date(),
      vtexRevenue: d === 5 ? 100 : 10,
      vtexOrders: null,
      ga4Sessions: null,
      ga4Purchases: null,
      gscClicks: null,
    }));
    const part = buildProjectionPart({
      metricKey: "vtex_revenue",
      period,
      metricDays: days,
      sourceStatuses: { vtex: "ok", ga4: "missing", gsc: "missing" },
    });
    expect(part).not.toBeNull();
    expect(part!.outlierDays.some((d) => d.dateYmd === "2026-10-05")).toBe(
      true,
    );
    expect(part!.projectedMonthTotal).toBeGreaterThan(part!.observedTotal!);
    const futurePoints = part!.points.filter((p) => p.isFuture);
    expect(futurePoints.length).toBeGreaterThan(0);
    expect(futurePoints.every((p) => p.dailyValue === null)).toBe(true);
  });

  it("ignora dias com sessão zero na conversão", () => {
    const days: MetricDayRow[] = [
      {
        id: "1",
        workspaceId: "w",
        calendarDay: new Date("2026-10-01T00:00:00.000Z"),
        collectedAt: new Date(),
        vtexRevenue: null,
        vtexOrders: null,
        ga4Sessions: 0,
        ga4Purchases: 0,
        gscClicks: null,
      },
      {
        id: "2",
        workspaceId: "w",
        calendarDay: new Date("2026-10-02T00:00:00.000Z"),
        collectedAt: new Date(),
        vtexRevenue: null,
        vtexOrders: null,
        ga4Sessions: 100,
        ga4Purchases: 2,
        gscClicks: null,
      },
    ];
    const part = buildProjectionPart({
      metricKey: "ga4_conversion_pct",
      period: {
        ...period,
        collectEnd: "2026-10-02T23:59:59.999-03:00",
      },
      metricDays: days,
      sourceStatuses: { vtex: "missing", ga4: "ok", gsc: "missing" },
    });
    expect(part?.mean).toBeCloseTo(2, 5);
    expect(part?.isRateMetric).toBe(true);
  });
});
