import { describe, expect, it } from "vitest";

import { buildWorkspaceAvisosDto } from "@/backend/lib/workspace/avisos-dto";
import type { WorkspaceCalendarPeriod } from "@/backend/lib/workspace/period";

const period: WorkspaceCalendarPeriod = {
  label: "Out/2026",
  start: "2026-10-01T00:00:00.000Z",
  end: "2026-10-31T23:59:59.999Z",
  collectEnd: "2026-10-08T23:59:59.999Z",
  periodStart: new Date("2026-10-01"),
  periodEnd: new Date("2026-10-31"),
  capturedOn: new Date("2026-10-08"),
  elapsedDays: 8,
  totalDays: 31,
};

describe("buildWorkspaceAvisosDto hasBand", () => {
  it("marca hasBand quando meta e mínimo válidos", () => {
    const dto = buildWorkspaceAvisosDto({
      workspaceId: "w1",
      workspaceName: "Loja",
      periodType: "month",
      period,
      targets: [
        {
          metricKey: "vtex_orders",
          periodType: "month",
          targetValue: 100,
          minExpectedValue: 80,
        },
      ],
      snapshot: null,
      snapshotStale: false,
      metricDays: [],
    });
    const orders = dto.sources
      .flatMap((s) => s.metrics)
      .find((m) => m.key === "vtex_orders");
    expect(orders?.hasBand).toBe(true);
    expect(orders?.minExpected).toBe(80);
  });

  it("não marca hasBand quando mínimo ausente", () => {
    const dto = buildWorkspaceAvisosDto({
      workspaceId: "w1",
      workspaceName: "Loja",
      periodType: "month",
      period,
      targets: [
        {
          metricKey: "vtex_orders",
          periodType: "month",
          targetValue: 100,
          minExpectedValue: null,
        },
      ],
      snapshot: null,
      snapshotStale: false,
      metricDays: [],
    });
    const orders = dto.sources
      .flatMap((s) => s.metrics)
      .find((m) => m.key === "vtex_orders");
    expect(orders?.hasBand).toBe(false);
    expect(orders?.hasTarget).toBe(true);
  });
});
