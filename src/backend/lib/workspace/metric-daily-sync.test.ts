import { describe, expect, it } from "vitest";

import { buildMetricDayUpserts } from "@/backend/lib/workspace/metric-daily-sync";
import { calendarDayFromYmd } from "@/backend/lib/workspace/period";

describe("buildMetricDayUpserts", () => {
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

  it("preenche zero em dia VTEX sem pedidos quando fonte ok", () => {
    const upserts = buildMetricDayUpserts({
      workspaceId: "ws1",
      period,
      collectedAt: new Date(),
      existing: [],
      vtexByDay: new Map([["2026-10-01", { revenue: 50, orders: 1 }]]),
      ga4ByDay: null,
      gscByDay: null,
    });

    expect(upserts).toHaveLength(2);
    const day2 = upserts.find(
      (u) => u.calendarDay.getTime() === calendarDayFromYmd("2026-10-02").getTime(),
    );
    expect(day2?.vtexRevenue).toBe(0);
    expect(day2?.vtexOrders).toBe(0);
  });
});
