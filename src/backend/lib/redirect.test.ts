import { describe, expect, it } from "vitest";

import { sanitizeRedirectPath } from "@/backend/lib/redirect";

describe("sanitizeRedirectPath", () => {
  it("retorna /dashboard quando o caminho é inválido", () => {
    expect(sanitizeRedirectPath(null)).toBe("/dashboard");
    expect(sanitizeRedirectPath("")).toBe("/dashboard");
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("//evil.com")).toBe("/dashboard");
  });

  it("preserva caminhos relativos válidos", () => {
    expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/dashboard?tab=1")).toBe("/dashboard?tab=1");
  });
});
