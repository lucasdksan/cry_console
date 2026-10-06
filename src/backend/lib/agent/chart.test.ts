import { describe, expect, it } from "vitest";

import {
  buildChartPart,
  buildSkillChartPart,
  extractChartMarker,
  resolveMetricFromHint,
  resolveChartMetricForCommand,
  shouldAttachChartFromCommand,
} from "@/backend/lib/agent/chart";
import type { MetricDayRow } from "@/backend/models/workspace-metric.model";

describe("agent-chart", () => {
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

  it("extrai marcador de gráfico", () => {
    const result = extractChartMarker(
      "Tendência estável.\n\n[[chart:vtex_revenue]]",
    );
    expect(result.metricKey).toBe("vtex_revenue");
    expect(result.cleanedText).toBe("Tendência estável.");
  });

  it("resolve métrica por hint", () => {
    expect(resolveMetricFromHint("sessões ga4")).toBe("ga4_sessions");
    expect(resolveMetricFromHint("")).toBe("vtex_revenue");
  });

  it("resolve métrica por comando", () => {
    expect(
      resolveChartMetricForCommand({
        command: { kind: "search" },
        markerMetric: null,
      }),
    ).toBe("gsc_clicks");
    expect(
      shouldAttachChartFromCommand({ kind: "search" }, null),
    ).toBe(true);
  });

  it("usa terminal do snapshot no último ponto", () => {
    const part = buildChartPart({
      metricKey: "vtex_revenue",
      period,
      metricDays: [],
      sourceStatuses: { vtex: "ok", ga4: "missing", gsc: "missing" },
      terminalValue: 42_000,
    });
    expect(part).not.toBeNull();
    expect(part?.points?.at(-1)?.value).toBe(42_000);
  });

  it("não retorna gráfico quando série só tem zeros", () => {
    const days: MetricDayRow[] = [
      {
        id: "1",
        workspaceId: "w",
        calendarDay: new Date("2026-10-01T00:00:00.000Z"),
        collectedAt: new Date(),
        vtexRevenue: 0,
        vtexOrders: null,
        ga4Sessions: null,
        ga4Purchases: null,
        gscClicks: null,
      },
    ];
    const part = buildChartPart({
      metricKey: "vtex_revenue",
      period,
      metricDays: days,
      sourceStatuses: { vtex: "ok", ga4: "missing", gsc: "missing" },
      terminalValue: null,
    });
    expect(part).toBeNull();
  });

  it("monta gráfico multi-métrica omitindo série vazia", () => {
    const days: MetricDayRow[] = [
      {
        id: "1",
        workspaceId: "w",
        calendarDay: new Date("2026-10-01T00:00:00.000Z"),
        collectedAt: new Date(),
        vtexRevenue: 100,
        vtexOrders: null,
        ga4Sessions: null,
        ga4Purchases: null,
        gscClicks: 10,
      },
    ];
    const built = buildSkillChartPart({
      skillName: "Search x VTEX",
      metricKeys: ["vtex_revenue", "gsc_clicks", "ga4_sessions"],
      period,
      metricDays: days,
      claritySnapshots: [],
      sourceStatuses: {
        vtex: "ok",
        ga4: "missing",
        gsc: "ok",
        clarity: "missing",
      },
      snapshotMetricValues: { vtex_revenue: 100, gsc_clicks: 10 },
    });
    expect(built.chart?.series).toHaveLength(2);
    expect(built.missingKeys).toContain("ga4_sessions");
    expect(built.presentKeys).toEqual(
      expect.arrayContaining(["vtex_revenue", "gsc_clicks"]),
    );
  });
});
