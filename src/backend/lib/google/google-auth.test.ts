import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  createServiceAccountJwt,
  getGoogleAccessToken,
} from "@/backend/lib/google/google-auth";
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

describe("google-auth", () => {
  it("cria JWT assinado para service account", () => {
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    const account = testServiceAccount(privateKey);
    const jwt = createServiceAccountJwt(account, [
      "https://www.googleapis.com/auth/analytics.readonly",
    ]);
    expect(jwt.split(".")).toHaveLength(3);
  });

  it("obtém access token via OAuth JWT bearer", async () => {
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    const account = testServiceAccount(privateKey);
    const fetchFn = vi.fn(async () =>
      Response.json({ access_token: "ya29.test-token" }),
    );

    const token = await getGoogleAccessToken(
      account,
      ["https://www.googleapis.com/auth/webmasters.readonly"],
      fetchFn,
    );

    expect(token).toBe("ya29.test-token");
    expect(fetchFn).toHaveBeenCalledOnce();
  });
});
