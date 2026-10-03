import { describe, expect, it, vi } from "vitest";

import {
  collectClarity,
  type FetchFn,
} from "@/backend/lib/clarity/clarity-collector";

describe("collectClarity", () => {
  it("parseia métricas do export API", async () => {
    const fetchFn = vi.fn<FetchFn>(async () =>
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
    expect(String(fetchFn.mock.calls[0]?.[0])).toBe(
      "https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=3&dimension1=Device",
    );
    expect(fetchFn.mock.calls[0]?.[1]).toMatchObject({ method: "GET" });
  });

  it("lê o formato oficial com information e dimensão Device", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json([
        {
          metricName: "Traffic",
          information: [
            { totalSessionCount: "800", Device: "Mobile" },
            { totalSessionCount: "400", Device: "PC" },
          ],
        },
        {
          metricName: "Dead Click Count",
          information: [{ sessionsCount: "45", subTotal: "60" }],
        },
        {
          metricName: "Quickback Click",
          information: [{ sessionsCount: "12", subTotal: "12" }],
        },
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
    expect(result?.devices).toEqual([
      { device: "Mobile", sessions: 800, share_pct: (800 / 1200) * 100 },
      { device: "PC", sessions: 400, share_pct: (400 / 1200) * 100 },
    ]);
  });
});
