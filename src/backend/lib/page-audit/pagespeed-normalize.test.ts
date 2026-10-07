import { describe, expect, it } from "vitest";

import {
  averagePerformanceScore,
  crossDevicePerformanceGap,
  normalizePageSpeedPair,
} from "@/backend/lib/page-audit/pagespeed-normalize";

describe("normalizePageSpeedPair", () => {
  it("trata formato legado como mobile", () => {
    const legacy = { performanceScore: 70, lcp: 1, fcp: 1, cls: 0, tbt: 0, ttfb: 0, inp: 0 };
    const pair = normalizePageSpeedPair(legacy);
    expect(pair.mobile?.performanceScore).toBe(70);
    expect(pair.desktop).toBeNull();
  });

  it("calcula gap entre mobile e desktop", () => {
    const gap = crossDevicePerformanceGap({
      mobile: {
        performanceScore: 50,
        lcp: null,
        fcp: null,
        cls: null,
        tbt: null,
        ttfb: null,
        inp: null,
      },
      desktop: {
        performanceScore: 80,
        lcp: null,
        fcp: null,
        cls: null,
        tbt: null,
        ttfb: null,
        inp: null,
      },
    });
    expect(gap).toBe(30);
  });

  it("média de performance ignora valores ausentes", () => {
    const avg = averagePerformanceScore({
      mobile: {
        performanceScore: 60,
        lcp: null,
        fcp: null,
        cls: null,
        tbt: null,
        ttfb: null,
        inp: null,
      },
      desktop: null,
    });
    expect(avg).toBe(60);
  });
});
