import { describe, expect, it, vi } from "vitest";

import { collectGa4Analytics } from "@/backend/lib/google/ga4-collector";

describe("collectGa4Analytics", () => {
  it("monta bundle normalizado a partir de runReport", async () => {
    const totalsResponse = {
      rows: [
        {
          metricValues: [
            { value: "1000" },
            { value: "800" },
            { value: "10" },
            { value: "5000" },
            { value: "200" },
            { value: "80" },
            { value: "5000" },
          ],
        },
      ],
    };
    const channelResponse = {
      rows: [
        {
          dimensionValues: [{ value: "Organic Search" }],
          metricValues: [{ value: "400" }, { value: "4" }, { value: "2000" }],
        },
      ],
    };
    const deviceResponse = {
      rows: [
        {
          dimensionValues: [{ value: "mobile" }],
          metricValues: [{ value: "700" }],
        },
        {
          dimensionValues: [{ value: "desktop" }],
          metricValues: [{ value: "300" }],
        },
      ],
    };

    let call = 0;
    const fetchFn = vi.fn(async () => {
      call += 1;
      const payload =
        call === 1 ? totalsResponse : call === 2 ? channelResponse : deviceResponse;
      return Response.json(payload);
    });

    const result = await collectGa4Analytics({
      accessToken: "token",
      propertyId: "123456789",
      period: { start: "2026-07-01", end: "2026-07-31" },
      fetchFn,
    });

    expect(result?.totals?.sessions).toBe(1000);
    expect(result?.funnel_rates?.view_to_cart_pct).toBeCloseTo(4, 1);
    expect(result?.channels?.[0]?.channel).toBe("Organic Search");
    expect(result?.devices?.[0]?.share_pct).toBeCloseTo(70, 1);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
});
