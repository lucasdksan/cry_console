import { describe, expect, it } from "vitest";

import { isPageAuditFresh } from "@/backend/lib/page-audit/cache";
import { PAGE_AUDIT_CACHE_MS } from "@/backend/lib/page-audit/types";

describe("isPageAuditFresh", () => {
  const url = "https://loja.example/";

  it("reutiliza dentro de 24h para mesma URL", () => {
    const now = Date.now();
    expect(
      isPageAuditFresh({
        collectedAt: new Date(now - PAGE_AUDIT_CACHE_MS + 1000),
        storedUrl: url,
        requestedUrl: url,
        force: false,
        nowMs: now,
      }),
    ).toBe(true);
  });

  it("invalida se URL mudou", () => {
    const now = Date.now();
    expect(
      isPageAuditFresh({
        collectedAt: new Date(now - 1000),
        storedUrl: url,
        requestedUrl: "https://loja.example/p",
        force: false,
        nowMs: now,
      }),
    ).toBe(false);
  });

  it("force ignora cache", () => {
    const now = Date.now();
    expect(
      isPageAuditFresh({
        collectedAt: new Date(now - 1000),
        storedUrl: url,
        requestedUrl: url,
        force: true,
        nowMs: now,
      }),
    ).toBe(false);
  });
});
