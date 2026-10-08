import { describe, expect, it } from "vitest";

import {
  buildIssuesListQuery,
  buildTransactionsDiscoverQuery,
  normalizeDurationMs,
  parseDiscoverVitalsRows,
  parseObservabilityPeriod,
  parseObservabilityPageFilter,
  parseSentryIssues,
  parseSentryReplays,
  rateVital,
} from "@/backend/lib/sentry/insights";
import {
  buildObservabilityInsightsCacheKey,
  clearObservabilityInsightsCacheForTests,
  getObservabilityInsightsCached,
  setObservabilityInsightsCached,
} from "@/backend/lib/sentry/insights-cache";

describe("insights queries", () => {
  it("usa padrão 14d, mapeia 7d legado e all para inválidos", () => {
    expect(parseObservabilityPeriod(undefined)).toBe("14d");
    expect(parseObservabilityPeriod("invalid")).toBe("14d");
    expect(parseObservabilityPeriod("7d")).toBe("14d");
    expect(parseObservabilityPageFilter(undefined)).toBe("all");
    expect(parseObservabilityPageFilter("nope")).toBe("all");
  });

  it("monta query de issues com filtro de página", () => {
    expect(buildIssuesListQuery("all")).toBe("is:unresolved");
    expect(buildIssuesListQuery("pdp")).toBe("is:unresolved page_type:pdp");
  });

  it("monta query discover de transações", () => {
    expect(buildTransactionsDiscoverQuery("cry-abc", "home")).toBe(
      "event.type:transaction project:cry-abc page_type:home",
    );
  });
});

describe("vital ratings", () => {
  it("classifica LCP nos limites web.dev", () => {
    expect(rateVital("lcp", 2000)).toBe("good");
    expect(rateVital("lcp", 3000)).toBe("needs-improvement");
    expect(rateVital("lcp", 4500)).toBe("poor");
  });

  it("normaliza segundos para ms", () => {
    expect(normalizeDurationMs(2.5)).toBe(2500);
    expect(normalizeDurationMs(2500)).toBe(2500);
  });
});

describe("parse fixtures", () => {
  it("parseia issues do Sentry", () => {
    const parsed = parseSentryIssues(
      [
        {
          id: "1",
          title: "Error: demo",
          level: "error",
          count: "3",
          lastSeen: "2026-01-01T00:00:00Z",
        },
      ],
      "my-org",
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.count).toBe(3);
    expect(parsed[0]?.permalink).toContain("my-org");
  });

  it("trata vital nulo como sem amostra", () => {
    const groups = parseDiscoverVitalsRows(
      [
        {
          "p75(measurements.lcp)": null,
          "count()": 0,
        },
      ],
      "home",
    );
    expect(groups[0]?.vitals[0]?.p75).toBeNull();
    expect(groups[0]?.vitals[0]?.rating).toBeNull();
  });

  it("parseia replays", () => {
    const parsed = parseSentryReplays(
      [
        {
          id: "replay-1",
          started_at: "2026-01-01T00:00:00Z",
          duration: 120,
          count_errors: 2,
          browser: { name: "Chrome", version: "120" },
          urls: ["https://loja.com/"],
        },
      ],
      "my-org",
    );
    expect(parsed[0]?.errorCount).toBe(2);
    expect(parsed[0]?.permalink).toContain("replay-1");
  });
});

describe("insights cache", () => {
  it("respeita TTL e não reutiliza após expirar", () => {
    clearObservabilityInsightsCacheForTests();
    const key = buildObservabilityInsightsCacheKey({
      workspaceId: "w1",
      period: "14d",
      pageFilter: "all",
      kind: "bundle",
    });
    setObservabilityInsightsCached(key, { ok: true }, 1000, 0);
    expect(getObservabilityInsightsCached(key, 500)).toEqual({ ok: true });
    expect(getObservabilityInsightsCached(key, 1500)).toBeUndefined();
  });
});
