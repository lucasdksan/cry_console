import { describe, expect, it } from "vitest";

import type { MetricDayRow } from "@/backend/models/workspace-metric.model";
import {
  buildMetricCumulativeSeries,
  computeMetricTargetHitStatus,
} from "@/backend/lib/workspace-metric-series";
import { calendarDayFromYmd } from "@/backend/lib/workspace-period";

function dayRow(
  ymd: string,
  partial: Partial<
    Pick<
      MetricDayRow,
      "vtexRevenue" | "vtexOrders" | "ga4Sessions" | "ga4Purchases" | "gscClicks"
    >
  >,
): MetricDayRow {
  return {
    id: ymd,
    workspaceId: "ws1",
    calendarDay: calendarDayFromYmd(ymd),
    collectedAt: new Date(),
    vtexRevenue: partial.vtexRevenue ?? null,
    vtexOrders: partial.vtexOrders ?? null,
    ga4Sessions: partial.ga4Sessions ?? null,
    ga4Purchases: partial.ga4Purchases ?? null,
    gscClicks: partial.gscClicks ?? null,
  };
}

describe("computeMetricTargetHitStatus", () => {
  it("marca atingida quando atual >= meta", () => {
    expect(
      computeMetricTargetHitStatus({ current: 100, target: 80 }),
    ).toBe("reached");
  });

  it("marca ainda não quando abaixo da meta", () => {
    expect(
      computeMetricTargetHitStatus({ current: 50, target: 80 }),
    ).toBe("not_reached");
  });
});

describe("buildMetricCumulativeSeries", () => {
  const period = {
    start: "2026-10-01T00:00:00.000-03:00",
    end: "2026-10-31T23:59:59.999-03:00",
    collectEnd: "2026-10-03T23:59:59.999-03:00",
    label: "Mês",
    periodStart: new Date(),
    periodEnd: new Date(),
    capturedOn: new Date(),
    totalDays: 31,
    elapsedDays: 3,
  };

  it("acumula receita VTEX e usa terminal no último dia", () => {
    const series = buildMetricCumulativeSeries({
      metricKey: "vtex_revenue",
      period,
      days: [
        dayRow("2026-10-01", { vtexRevenue: 10 }),
        dayRow("2026-10-02", { vtexRevenue: 5 }),
        dayRow("2026-10-03", { vtexRevenue: 1 }),
      ],
      sourceStatuses: { vtex: "ok", ga4: "missing", gsc: "missing" },
      terminalValue: 20,
    });

    expect(series).toHaveLength(3);
    expect(series[0]?.value).toBe(10);
    expect(series[1]?.value).toBe(15);
    expect(series[2]?.value).toBe(20);
  });

  it("interrompe série GSC quando dia sem clique", () => {
    const series = buildMetricCumulativeSeries({
      metricKey: "gsc_clicks",
      period,
      days: [
        dayRow("2026-10-01", { gscClicks: 2 }),
        dayRow("2026-10-02", { gscClicks: 3 }),
        dayRow("2026-10-03", { gscClicks: null }),
      ],
      sourceStatuses: { vtex: "missing", ga4: "missing", gsc: "ok" },
      terminalValue: 5,
    });

    expect(series[0]?.value).toBe(2);
    expect(series[1]?.value).toBe(5);
    expect(series[2]?.value).toBe(5);
  });
});
