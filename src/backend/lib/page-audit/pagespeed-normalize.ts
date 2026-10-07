import type { PageSpeedPair, PageSpeedSignals } from "@/backend/lib/page-audit/types";

export function normalizePageSpeedPair(raw: unknown): PageSpeedPair {
  if (raw == null || typeof raw !== "object") {
    return { mobile: null, desktop: null };
  }
  const obj = raw as Record<string, unknown>;
  if ("mobile" in obj || "desktop" in obj) {
    return {
      mobile: (obj.mobile as PageSpeedSignals | null) ?? null,
      desktop: (obj.desktop as PageSpeedSignals | null) ?? null,
    };
  }
  return { mobile: raw as PageSpeedSignals, desktop: null };
}

export function averagePerformanceScore(pair: PageSpeedPair): number | null {
  const scores = [pair.mobile?.performanceScore, pair.desktop?.performanceScore].filter(
    (s): s is number => s != null && !Number.isNaN(s),
  );
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function crossDevicePerformanceGap(pair: PageSpeedPair): number | null {
  const m = pair.mobile?.performanceScore;
  const d = pair.desktop?.performanceScore;
  if (m == null || d == null) return null;
  return Math.abs(m - d);
}
