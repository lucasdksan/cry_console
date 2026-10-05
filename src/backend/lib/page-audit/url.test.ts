import { describe, expect, it } from "vitest";

import { resolveAuditUrl } from "@/backend/lib/page-audit/url";

describe("resolveAuditUrl", () => {
  it("usa siteUrl quando caminho vazio", () => {
    expect(resolveAuditUrl("https://loja.example.com/")).toBe("https://loja.example.com/");
  });

  it("combina siteUrl com caminho relativo", () => {
    expect(resolveAuditUrl("https://loja.example.com", "/p/produto")).toBe(
      "https://loja.example.com/p/produto",
    );
  });

  it("rejeita javascript no caminho", () => {
    expect(() => resolveAuditUrl("https://loja.example.com", "javascript:alert(1)")).toThrow();
  });

  it("rejeita URL absoluta de outro domínio", () => {
    expect(() =>
      resolveAuditUrl("https://loja.example.com", "https://evil.example/p"),
    ).toThrow();
  });
});
