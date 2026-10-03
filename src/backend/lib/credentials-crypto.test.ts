import { afterEach, describe, expect, it } from "vitest";

import {
  decryptSecret,
  encryptSecret,
  type SecretField,
} from "@/backend/lib/credentials-crypto";

const TEST_KEY = Buffer.alloc(32, 7).toString("base64");

describe("credentials-crypto", () => {
  afterEach(() => {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
  });

  it("cifra e decifra com AAD ligado ao workspace e ao campo", () => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = TEST_KEY;
    const workspaceId = "ws_abc";
    const field: SecretField = "vtexAppToken";
    const plaintext = "super-secret-token";

    const payload = encryptSecret(plaintext, workspaceId, field);
    expect(decryptSecret(payload, workspaceId, field)).toBe(plaintext);
  });

  it("rejeita descriptografia com campo ou workspace incorreto", () => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = TEST_KEY;
    const payload = encryptSecret("x", "ws1", "clarityToken");

    expect(() => decryptSecret(payload, "ws2", "clarityToken")).toThrow();
    expect(() => decryptSecret(payload, "ws1", "vtexAppKey")).toThrow();
  });

  it("gera payloads distintos para o mesmo texto", () => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = TEST_KEY;
    const a = encryptSecret("same", "ws1", "vtexAppKey");
    const b = encryptSecret("same", "ws1", "vtexAppKey");
    expect(a).not.toBe(b);
  });
});
