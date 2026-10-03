import { describe, expect, it } from "vitest";

import {
  assertVtexAccountFields,
  normalizeWorkspaceNameKey,
  parseGaServiceAccountJson,
} from "@/backend/lib/workspace-policy";

describe("workspace-policy", () => {
  it("normaliza nameKey sem distinção de maiúsculas", () => {
    expect(normalizeWorkspaceNameKey("  Damyller  ")).toBe("damyller");
  });

  it("exige account name e environment quando há credencial VTEX", () => {
    expect(() =>
      assertVtexAccountFields({
        vtexAppKey: "key",
        vtexAppToken: "",
      }),
    ).toThrow(/Account Name/);

    expect(() =>
      assertVtexAccountFields({
        vtexAppKey: "key",
        vtexAccountName: "loja",
        vtexEnvironment: "invalid",
      }),
    ).toThrow(/Environment/);

    expect(() =>
      assertVtexAccountFields({
        vtexAppKey: "key",
        vtexAccountName: "loja",
        vtexEnvironment: "vtexcommercestable",
      }),
    ).not.toThrow();
  });

  it("valida JSON de service account do GA", () => {
    const json = JSON.stringify({
      type: "service_account",
      project_id: "p",
      private_key_id: "k",
      private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
      client_email: "ga@project.iam.gserviceaccount.com",
      client_id: "123",
    });

    const parsed = parseGaServiceAccountJson(json);
    expect(parsed.client_email).toBe("ga@project.iam.gserviceaccount.com");
  });
});
