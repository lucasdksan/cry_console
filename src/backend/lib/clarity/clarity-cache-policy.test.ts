import { describe, expect, it } from "vitest";

import {
  clarityDailyApiBudgetAllowsFetch,
  clarityNumOfDaysInt,
  clarityUtcCapturedOn,
  formatClarityCacheNote,
  isClarityQuotaError,
  isClaritySnapshotFresh,
} from "@/backend/lib/clarity/clarity-cache-policy";

describe("clarityUtcCapturedOn", () => {
  it("usa meia-noite UTC do dia corrente", () => {
    const captured = clarityUtcCapturedOn(Date.parse("2026-10-04T15:30:00.000Z"));
    expect(captured.toISOString()).toBe("2026-10-04T00:00:00.000Z");
  });
});

describe("clarityNumOfDaysInt", () => {
  it("limita a 3 dias", () => {
    expect(clarityNumOfDaysInt("2026-07-01", "2026-07-31")).toBe(3);
  });
});

describe("isClaritySnapshotFresh", () => {
  it("aceita snapshot ok", () => {
    expect(isClaritySnapshotFresh({ status: "ok" })).toBe(true);
    expect(isClaritySnapshotFresh({ status: "failed" })).toBe(false);
  });
});

describe("clarityDailyApiBudgetAllowsFetch", () => {
  it("bloqueia após fetch no dia", () => {
    expect(clarityDailyApiBudgetAllowsFetch(false)).toBe(true);
    expect(clarityDailyApiBudgetAllowsFetch(true)).toBe(false);
  });
});

describe("isClarityQuotaError", () => {
  it("detecta 429 e mensagem de cota", () => {
    expect(
      isClarityQuotaError(new Error("Clarity API falhou (429): Exceeded daily limit")),
    ).toBe(true);
    expect(isClarityQuotaError(new Error("Clarity API falhou (400)"))).toBe(false);
  });
});

describe("formatClarityCacheNote", () => {
  it("retorna null para coleta live", () => {
    expect(
      formatClarityCacheNote({
        fromCache: false,
        stale: false,
        collectedAt: new Date("2026-10-04T12:00:00.000Z"),
      }),
    ).toBeNull();
  });

  it("descreve cache do dia", () => {
    expect(
      formatClarityCacheNote({
        fromCache: true,
        stale: false,
        collectedAt: new Date("2026-10-04T12:00:00.000Z"),
      }),
    ).toContain("cache de hoje");
  });
});
