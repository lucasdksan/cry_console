import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { runMeasurementCollect } from "@/backend/lib/measurement/run-collect";
import type { GaServiceAccount } from "@/backend/lib/workspace-policy";

function testServiceAccount(privateKey: string): GaServiceAccount {
  return {
    type: "service_account",
    project_id: "test-project",
    private_key_id: "key-id",
    private_key: privateKey,
    client_email: "svc@test-project.iam.gserviceaccount.com",
    client_id: "123456789",
  };
}

describe("runMeasurementCollect", () => {
  it("marca analytics como failed sem property id", async () => {
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });

    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com/token")) {
        return Response.json({ access_token: "ya29.test" });
      }
      return Response.json({ rows: [] });
    });

    const result = await runMeasurementCollect({
      secrets: {
        siteUrl: "https://www.loja.com.br/",
        gaServiceAccount: testServiceAccount(privateKey),
        clarityToken: "clarity",
      },
      period: { start: "2026-07-01", end: "2026-07-31" },
      sources: ["analytics"],
      fetchFn,
    });

    const analyticsResult = result.sourceResults.find(
      (item) => item.source === "analytics",
    );
    expect(analyticsResult?.status).toBe("failed");
    expect(analyticsResult?.error).toMatch(/Property ID/i);
  });

  it("pula google quando service account ausente", async () => {
    const result = await runMeasurementCollect({
      secrets: { siteUrl: "https://www.loja.com.br/" },
      period: { start: "2026-07-01", end: "2026-07-31" },
      sources: ["analytics", "search-console"],
    });

    expect(result.sourceResults).toHaveLength(2);
    expect(result.sourceResults.every((r) => r.status === "failed")).toBe(true);
    expect(result.dataGaps).toHaveLength(2);
  });
});
