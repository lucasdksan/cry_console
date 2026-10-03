import { describe, expect, it, vi } from "vitest";

import { collectClarity } from "@/backend/lib/clarity/clarity-collector";

describe("collectClarity", () => {
  it("parseia métricas do export API", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json([
        { metricName: "SessionCount", value: 1200 },
        { metricName: "DeadClickCount", value: 45 },
        { metricName: "QuickBackCount", value: 12 },
        { metricName: "SessionCount", dimension: "Mobile", value: 800 },
        { metricName: "SessionCount", dimension: "PC", value: 400 },
      ]),
    );

    const result = await collectClarity({
      token: "clarity-token",
      period: { start: "2026-07-01", end: "2026-07-31" },
      fetchFn,
    });

    expect(result?.sessions).toBe(1200);
    expect(result?.deadClicks).toBe(45);
    expect(result?.quickBacks).toBe(12);
    expect(result?.devices).toHaveLength(2);
  });
});
