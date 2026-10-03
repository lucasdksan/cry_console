import { describe, expect, it } from "vitest";

import { normalizeGscSiteUrl } from "@/backend/lib/google/gsc-site-url";

describe("normalizeGscSiteUrl", () => {
  it("garante barra final em URL prefix", () => {
    expect(normalizeGscSiteUrl("https://www.loja.com.br")).toBe(
      "https://www.loja.com.br/",
    );
    expect(normalizeGscSiteUrl("https://www.loja.com.br/")).toBe(
      "https://www.loja.com.br/",
    );
  });
});
