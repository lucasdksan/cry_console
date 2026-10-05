import { describe, expect, it } from "vitest";

import { buildAgentMessageParts } from "@/backend/lib/agent/parts";
import type { AgentWorkspaceContext } from "@/backend/lib/agent/context";

describe("buildAgentMessageParts", () => {
  const baseContext = {
    workspaceName: "Loja",
    analysisSummary: null,
    measurement: null,
    narrative: null,
    metricDaysLoaded: true,
    periodLabel: "Mês",
    metricKeyForChart: "vtex_revenue" as const,
    snapshotMetricValues: {},
    sourceStatuses: { vtex: "ok", ga4: "missing", gsc: "missing" },
    metricDays: [],
    period: {
      start: "2026-10-01T00:00:00.000-03:00",
      end: "2026-10-31T23:59:59.999-03:00",
      collectEnd: "2026-10-03T23:59:59.999-03:00",
      label: "Mês",
      periodStart: new Date(),
      periodEnd: new Date(),
      capturedOn: new Date(),
      totalDays: 31,
      elapsedDays: 3,
    },
  } satisfies AgentWorkspaceContext;

  it("modo plan guarda artifacts e preview de projeção", () => {
    const built = buildAgentMessageParts({
      mode: "plan",
      text: "Plano\n[[projection:vtex_revenue]]",
      workspaceContext: {
        ...baseContext,
        metricDays: [
          {
            id: "1",
            workspaceId: "w",
            calendarDay: new Date("2026-10-01T00:00:00.000Z"),
            collectedAt: new Date(),
            vtexRevenue: 50,
            vtexOrders: null,
            ga4Sessions: null,
            ga4Purchases: null,
            gscClicks: null,
          },
          {
            id: "2",
            workspaceId: "w",
            calendarDay: new Date("2026-10-02T00:00:00.000Z"),
            collectedAt: new Date(),
            vtexRevenue: 70,
            vtexOrders: null,
            ga4Sessions: null,
            ga4Purchases: null,
            gscClicks: null,
          },
        ],
      },
      workspaceCommand: { kind: "projection", metricHint: "receita" },
    });
    expect(built.artifacts.projectionMetrics).toContain("vtex_revenue");
    expect(built.parts.some((p) => p.type === "projection")).toBe(true);
  });

  it("replay de artifacts ignora marcadores no texto", () => {
    const built = buildAgentMessageParts({
      mode: "agent",
      text: "Executado.",
      workspaceContext: {
        ...baseContext,
        metricDays: [
          {
            id: "1",
            workspaceId: "w",
            calendarDay: new Date("2026-10-01T00:00:00.000Z"),
            collectedAt: new Date(),
            vtexRevenue: 100,
            vtexOrders: null,
            ga4Sessions: null,
            ga4Purchases: null,
            gscClicks: null,
          },
        ],
        snapshotMetricValues: { vtex_revenue: 100 },
      },
      replayArtifacts: {
        chartMetrics: ["vtex_revenue"],
        projectionMetrics: [],
        funnel: false,
        actionPlan: false,
      },
    });
    expect(built.parts.some((p) => p.type === "chart")).toBe(true);
    expect(built.artifacts.chartMetrics).toContain("vtex_revenue");
  });
});
