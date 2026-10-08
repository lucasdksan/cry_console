import { describe, expect, it } from "vitest";

import { suggestStorefrontFix } from "@/backend/lib/sentry/issue-diagnosis";
import {
  buildReplaySummary,
  rateIssueSeverity,
  rateReplaySeverity,
  rateVitalsGroupSeverity,
  vitalRatingToSeverity,
} from "@/backend/lib/sentry/insights-severity";

describe("insights-severity", () => {
  it("classifica erro frequente como crítico", () => {
    expect(
      rateIssueSeverity({
        level: "error",
        count: 12,
        lastSeen: new Date().toISOString(),
      }),
    ).toBe("critico");
  });

  it("mapeia vital ruim para crítico", () => {
    expect(vitalRatingToSeverity("poor")).toBe("critico");
    expect(vitalRatingToSeverity("good")).toBe("ok");
  });

  it("resume grupo de vitals pelo pior indicador", () => {
    expect(
      rateVitalsGroupSeverity([
        { rating: "good" },
        { rating: "poor" },
      ]),
    ).toBe("critico");
  });

  it("gera sugestão de correção sem referência externa", () => {
    const suggestion = suggestStorefrontFix({
      type: "TypeError",
      value: "Cannot read properties of undefined (reading 'price')",
      functionName: "ProductPrice",
      filename: "pdp.js",
    });
    expect(suggestion).toContain("price");
    expect(suggestion).toContain("ProductPrice");
    expect(suggestion.toLowerCase()).not.toContain("sentry");
  });

  it("classifica replay com erros", () => {
    expect(rateReplaySeverity(0)).toBe("ok");
    expect(rateReplaySeverity(2)).toBe("alerta");
    expect(
      buildReplaySummary({
        errorCount: 2,
        browser: "Chrome",
        url: "https://loja.com/p/",
        severity: "alerta",
      }),
    ).toContain("2 erro");
  });
});
