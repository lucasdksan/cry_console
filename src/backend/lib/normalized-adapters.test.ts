import { describe, expect, it } from "vitest";

import {
  adaptAnalytics,
  adaptClarity,
  adaptSearchConsole,
} from "@/backend/lib/normalized-adapters";

describe("adaptAnalytics", () => {
  it("maps GA4 raw schema to dashboard funnel rates", () => {
    const adapted = adaptAnalytics({
      totals: {
        sessions: 1000,
        activeUsers: 800,
        ecommercePurchases: 10,
        taxa_conversao_sessao: 0.01,
      },
      funnel: {
        view_item: 5000,
        add_to_cart: 500,
        begin_checkout: 200,
        purchase: 10,
      },
      channels: [
        {
          channel: "Paid Search",
          sessions: 100,
          conv_rate: 0.025,
          revenue: 1000,
        },
      ],
    });
    expect(adapted?.totals?.totalUsers).toBe(800);
    expect(adapted?.funnel_rates?.session_to_purchase_pct).toBeCloseTo(1, 1);
    expect(adapted?.funnel_rates?.view_to_cart_pct).toBeCloseTo(10, 1);
    expect(adapted?.channels?.[0]?.conversion_pct).toBeCloseTo(2.5, 1);
  });
});

describe("adaptClarity", () => {
  it("normaliza dead_clicks e quick_backs", () => {
    const adapted = adaptClarity({
      sessions: 100,
      dead_clicks: 12,
      quick_backs: 3,
    });
    expect(adapted?.sessions).toBe(100);
    expect(adapted?.deadClicks).toBe(12);
    expect(adapted?.quickBacks).toBe(3);
  });
});

describe("adaptSearchConsole", () => {
  it("mapeia linhas da Search Console API", () => {
    const adapted = adaptSearchConsole({
      overview: {
        clicks: 100,
        impressions: 5000,
        ctr: 0.02,
        position: 8.5,
      },
      rows: [
        {
          keys: ["sapato running"],
          clicks: 40,
          impressions: 1200,
          ctr: 0.033,
          position: 6.2,
        },
      ],
      brandKeyword: "running",
    });

    expect(adapted?.overview?.clicks).toBe(100);
    expect(adapted?.top_queries?.[0]?.query).toBe("sapato running");
    expect(adapted?.striking_distance?.[0]?.query).toBe("sapato running");
    expect(adapted?.brand_ctr).toBeCloseTo(0.033, 3);
  });
});
