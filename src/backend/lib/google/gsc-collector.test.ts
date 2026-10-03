import { describe, expect, it, vi } from "vitest";

import { collectSearchConsole } from "@/backend/lib/google/gsc-collector";

describe("collectSearchConsole", () => {
  it("normaliza overview e consultas", async () => {
    let call = 0;
    const fetchFn = vi.fn(async () => {
      call += 1;
      if (call === 1) {
        return Response.json({
          rows: [{ clicks: 50, impressions: 2000, ctr: 0.025, position: 7 }],
        });
      }
      return Response.json({
        rows: [
          {
            keys: ["tenis"],
            clicks: 20,
            impressions: 800,
            ctr: 0.025,
            position: 5.5,
          },
        ],
      });
    });

    const result = await collectSearchConsole({
      accessToken: "token",
      siteUrl: "https://www.loja.com.br/",
      period: { start: "2026-07-01", end: "2026-07-31" },
      fetchFn,
    });

    expect(result?.overview?.clicks).toBe(50);
    expect(result?.top_queries?.[0]?.query).toBe("tenis");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
