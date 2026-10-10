import type { AnalysisDataGap } from "@/backend/lib/analysis/types";

export type PortfolioAbcClass = "A" | "B" | "C";

export type PortfolioSkuCrossGa4 = {
  items_viewed: number;
  items_added_to_cart: number;
  items_purchased: number;
  add_to_cart_rate_pct: number | null;
  purchase_rate_pct: number | null;
};

export type PortfolioSkuCrossGsc = {
  clicks: number;
  impressions: number;
  position: number;
};

export type PortfolioSkuEntry = {
  key: string;
  skuId: string | null;
  productId: string | null;
  name: string;
  detailUrl: string | null;
  revenue: number;
  quantity: number;
  orderCount: number;
  canceledOrderCount: number;
  cancelRatePct: number;
  abcClass: PortfolioAbcClass;
  clusterId: number | null;
  clusterLabel: string | null;
  riskLevel: "critico" | "alerta" | null;
  ga4: PortfolioSkuCrossGa4 | null;
  gsc: PortfolioSkuCrossGsc | null;
};

export type PortfolioClusterGroup = {
  clusterId: number;
  label: string;
  skuCount: number;
  revenueSharePct: number;
};

export type PortfolioAbcSlice = {
  class: PortfolioAbcClass;
  skuCount: number;
  revenueSharePct: number;
};

export type PortfolioRiskEntry = {
  key: string;
  name: string;
  level: "critico" | "alerta";
  cancelRatePct: number;
};

export type AnalysisPortfolioJson = {
  available: boolean;
  populationOrders: number;
  cappedAtMax: boolean;
  skuCount: number;
  revenueLineTotal: number;
  revenueOrderTotal: number;
  reconciliationGapPct: number | null;
  abcSlices: PortfolioAbcSlice[];
  clusters: PortfolioClusterGroup[];
  topSkus: PortfolioSkuEntry[];
  risks: PortfolioRiskEntry[];
  dataGaps: AnalysisDataGap[];
  llmSummary: string;
};

export type Ga4ItemRow = {
  itemId: string;
  itemName: string;
  itemsViewed: number;
  itemsAddedToCart: number;
  itemsPurchased: number;
  itemRevenue: number;
};

export type GscPageRow = {
  page: string;
  clicks: number;
  impressions: number;
  position: number;
};

export const PORTFOLIO_UNKNOWN_KEY = "unknown";
