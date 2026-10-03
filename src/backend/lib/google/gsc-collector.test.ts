import { describe, expect, it, vi } from "vitest";

import { collectSearchConsole } from "@/backend/lib/google/gsc-collector";

describe("collectSearchConsole", () => {
  it("consulta a propriedade de domínio quando o prefixo https não está liberado", async () => {
    const fetchFn = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/webmasters/v3/sites")) {
          return Response.json({
            siteEntry: [
              {
                siteUrl: "sc-domain:loja.com.br",
                permissionLevel: "siteOwner",
              },
            ],
          });
        }

        const body = JSON.parse(String(init?.body ?? "{}")) as {
          dimensions?: string[];
        };
        if (!body.dimensions) {
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
      },
    );

    const result = await collectSearchConsole({
      accessToken: "token",
      siteUrl: "https://www.loja.com.br/",
      period: { start: "2026-07-01", end: "2026-07-31" },
      fetchFn,
    });

    expect(result?.overview?.clicks).toBe(50);
    expect(result?.top_queries?.[0]?.query).toBe("tenis");
    expect(fetchFn).toHaveBeenCalledTimes(3);
    const queried = fetchFn.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.includes("searchAnalytics"));
    expect(queried.every((url) => url.includes("sc-domain%3Aloja.com.br"))).toBe(
      true,
    );
  });

  it("explica a falta de permissão sem repetir o 403 da API", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({ siteEntry: [] }),
    );

    await expect(
      collectSearchConsole({
        accessToken: "token",
        siteUrl: "https://www.loja.com.br/",
        period: { start: "2026-07-01", end: "2026-07-31" },
        fetchFn,
      }),
    ).rejects.toThrow(/não tem permissão no Search Console/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
