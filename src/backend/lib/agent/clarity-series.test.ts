import { describe, expect, it } from "vitest";

import { buildClarityMetricSeries } from "@/backend/lib/agent/clarity-series";

describe("buildClarityMetricSeries", () => {
  const period = {
    start: "2026-10-01T00:00:00.000-03:00",
    end: "2026-10-31T23:59:59.999-03:00",
    collectEnd: "2026-10-02T23:59:59.999-03:00",
    label: "Mês",
    periodStart: new Date(),
    periodEnd: new Date(),
    capturedOn: new Date(),
    totalDays: 31,
    elapsedDays: 2,
  };

  it("monta pontos a partir de snapshots por dia", () => {
    const points = buildClarityMetricSeries({
      metricKey: "clarity_sessions",
      period,
      snapshots: [
        {
          id: "1",
          workspaceId: "w",
          capturedOn: new Date("2026-10-01T12:00:00.000Z"),
          numOfDays: 3,
          collectedAt: new Date(),
          fetchedFromApi: true,
          status: "ok",
          payload: { sessions: 120, deadClicks: 4, quickBacks: 2 },
          error: null,
        },
      ],
      terminalValue: 150,
    });
    expect(points.some((p) => p.value === 120)).toBe(true);
    expect(points.at(-1)?.value).toBe(150);
  });
});
