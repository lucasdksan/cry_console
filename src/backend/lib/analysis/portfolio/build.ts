import type { AnalysisDataGap } from "@/backend/lib/analysis/types";

import { assignAbc } from "@/backend/lib/analysis/portfolio/abc";
import {
  rowsFromSnapshot,
  type PortfolioAccumulatorSnapshot,
} from "@/backend/lib/analysis/portfolio/aggregate";
import {
  buildGa4Index,
  buildGscPathIndex,
  countGa4Matches,
  matchGa4ForSku,
  matchGscForSku,
} from "@/backend/lib/analysis/portfolio/cross";
import { runPortfolioKmeans } from "@/backend/lib/analysis/portfolio/kmeans";
import { labelCluster } from "@/backend/lib/analysis/portfolio/labels";
import {
  cancelRatePct,
  detectPortfolioRisks,
  riskLevelForRow,
} from "@/backend/lib/analysis/portfolio/risks";
import { buildPortfolioLlmSummary } from "@/backend/lib/analysis/portfolio/summary";
import type {
  AnalysisPortfolioJson,
  Ga4ItemRow,
  GscPageRow,
  PortfolioClusterGroup,
  PortfolioSkuEntry,
} from "@/backend/lib/analysis/portfolio/types";

const RECONCILIATION_THRESHOLD_PCT = 15;
const UI_TOP_SKUS = 20;
const KMEANS_MIN_SKUS = 3;
const KMEANS_TOP_CAP = 50;

function selectKmeansPopulation(
  tagged: ReturnType<typeof assignAbc>["tagged"],
): ReturnType<typeof assignAbc>["tagged"] {
  const withRevenue = tagged.filter((r) => r.revenue > 0);
  const withRepeatOrders = withRevenue.filter(
    (r) => r.orderIds.size + r.canceledOrderIds.size >= 2,
  );
  const base =
    withRepeatOrders.length >= KMEANS_MIN_SKUS
      ? withRepeatOrders
      : withRevenue;
  return [...base]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, KMEANS_TOP_CAP);
}

export type BuildPortfolioInput = {
  snapshot: PortfolioAccumulatorSnapshot;
  ga4Items: Ga4ItemRow[] | null;
  ga4Ok: boolean;
  gscPages: GscPageRow[] | null;
  gscOk: boolean;
};

export function buildAnalysisPortfolio(
  input: BuildPortfolioInput,
): AnalysisPortfolioJson {
  const dataGaps: AnalysisDataGap[] = [];
  const rows = rowsFromSnapshot(input.snapshot);

  if (input.snapshot.cappedAtMax) {
    dataGaps.push({
      source: "vtex",
      reason: "Limite de 10.000 pedidos mais recentes atingido na janela",
      impact: "Portfólio pode subestimar SKUs de cauda longa",
    });
  }

  if (input.snapshot.missingPriceLines > 0) {
    dataGaps.push({
      source: "vtex",
      reason: `${input.snapshot.missingPriceLines} linhas sem preço de item`,
      impact: "Receita de SKU omitida nessas linhas",
    });
  }

  if (input.snapshot.unknownLineCount > 0) {
    dataGaps.push({
      source: "vtex",
      reason: `${input.snapshot.unknownLineCount} linhas sem skuId, productId ou nome`,
      impact: "Itens não entram no ranking",
    });
  }

  const reconciliationGapPct =
    input.snapshot.revenueOrderTotal > 0
      ? (Math.abs(
          input.snapshot.revenueLineTotal - input.snapshot.revenueOrderTotal,
        ) /
          input.snapshot.revenueOrderTotal) *
        100
      : null;

  if (
    reconciliationGapPct !== null &&
    reconciliationGapPct > RECONCILIATION_THRESHOLD_PCT
  ) {
    dataGaps.push({
      source: "vtex",
      reason: `Receita de linhas e de pedidos divergem ${reconciliationGapPct.toFixed(1)}%`,
      impact: "Validar preços de item e totais OMS",
    });
  }

  if (!input.ga4Ok && input.ga4Items === null) {
    dataGaps.push({
      source: "ga4",
      reason: "Relatório de itens GA4 indisponível neste run",
      impact: "Sem cruzamento de visualizações e compras por itemId",
    });
  }

  if (!input.gscOk && input.gscPages === null) {
    dataGaps.push({
      source: "gsc",
      reason: "Relatório de páginas Search Console indisponível neste run",
      impact: "Sem cruzamento orgânico por URL de PDP",
    });
  }

  if (rows.length === 0) {
    return {
      available: false,
      populationOrders: input.snapshot.populationOrders,
      cappedAtMax: input.snapshot.cappedAtMax,
      skuCount: 0,
      revenueLineTotal: input.snapshot.revenueLineTotal,
      revenueOrderTotal: input.snapshot.revenueOrderTotal,
      reconciliationGapPct,
      abcSlices: [
        { class: "A", skuCount: 0, revenueSharePct: 0 },
        { class: "B", skuCount: 0, revenueSharePct: 0 },
        { class: "C", skuCount: 0, revenueSharePct: 0 },
      ],
      clusters: [],
      topSkus: [],
      risks: [],
      dataGaps,
      llmSummary: "Portfólio VTEX indisponível: nenhum SKU identificado.",
    };
  }

  const { tagged, slices } = assignAbc(rows);
  const risks = detectPortfolioRisks(tagged);

  const eligibleForKmeans = selectKmeansPopulation(tagged);

  let clusterAssignments: number[] | null = null;
  let kmeansMeta: ReturnType<typeof runPortfolioKmeans> = null;
  const clusterLabelsById = new Map<number, string>();

  if (eligibleForKmeans.length < KMEANS_MIN_SKUS) {
    dataGaps.push({
      source: "vtex",
      reason: "Menos de 3 SKUs com receita para segmentação",
      impact: "Segmentos do portfólio omitidos",
    });
  } else {
    const keys = eligibleForKmeans.map((r) => r.key);
    const vectors = eligibleForKmeans.map((r) => [
      r.revenue,
      r.quantity,
      cancelRatePct(r),
      r.orderIds.size + r.canceledOrderIds.size,
    ]);
    kmeansMeta = runPortfolioKmeans(vectors);
    if (kmeansMeta) {
      clusterAssignments = kmeansMeta.clusters;
      for (let c = 0; c < kmeansMeta.bestK; c += 1) {
        clusterLabelsById.set(
          c,
          labelCluster(eligibleForKmeans, c, kmeansMeta.clusters, keys),
        );
      }
    }
  }

  const ga4Index =
    input.ga4Items && input.ga4Items.length > 0
      ? buildGa4Index(input.ga4Items)
      : new Map();
  const gscIndex =
    input.gscPages && input.gscPages.length > 0
      ? buildGscPathIndex(input.gscPages)
      : new Map();

  const ga4MatchCount = countGa4Matches(tagged, ga4Index);
  if (input.ga4Ok && input.ga4Items && input.ga4Items.length > 0 && ga4MatchCount === 0) {
    dataGaps.push({
      source: "ga4",
      reason: "Nenhum itemId GA4 corresponde a skuId ou productId VTEX",
      impact: "Cobertura zero no cruzamento GA4",
    });
  }

  const skusWithoutDetailUrl = tagged.filter((r) => !r.detailUrl).length;
  if (skusWithoutDetailUrl > 0 && input.gscOk) {
    dataGaps.push({
      source: "vtex",
      reason: `${skusWithoutDetailUrl} SKUs sem detailUrl no OMS`,
      impact: "Search Console não pode ser cruzado nesses itens",
    });
  }

  let gscMatchCount = 0;
  const clusterRevenue = new Map<number, number>();

  const enriched: PortfolioSkuEntry[] = tagged.map((row) => {
    const ga4 = matchGa4ForSku(row, ga4Index);
    const gsc = matchGscForSku(row, gscIndex);
    if (ga4) {
      /* counted in countGa4Matches */
    }
    if (gsc) {
      gscMatchCount += 1;
    }

    let clusterId: number | null = null;
    let clusterLabel: string | null = null;
    if (clusterAssignments && kmeansMeta) {
      const idx = eligibleForKmeans.findIndex((e) => e.key === row.key);
      if (idx >= 0) {
        clusterId = clusterAssignments[idx] ?? null;
        if (clusterId !== null) {
          clusterLabel = clusterLabelsById.get(clusterId) ?? "equilibrado";
          clusterRevenue.set(
            clusterId,
            (clusterRevenue.get(clusterId) ?? 0) + row.revenue,
          );
        }
      }
    }

    return {
      key: row.key,
      skuId: row.skuId,
      productId: row.productId,
      name: row.name,
      detailUrl: row.detailUrl,
      revenue: row.revenue,
      quantity: row.quantity,
      orderCount: row.orderIds.size,
      canceledOrderCount: row.canceledOrderIds.size,
      cancelRatePct: cancelRatePct(row),
      abcClass: row.abcClass,
      clusterId,
      clusterLabel,
      riskLevel: riskLevelForRow(row),
      ga4,
      gsc,
    };
  });

  const totalRevenue = enriched.reduce((s, r) => s + r.revenue, 0);
  const clusters: PortfolioClusterGroup[] = [];
  if (kmeansMeta) {
    for (let c = 0; c < kmeansMeta.bestK; c += 1) {
      const members = enriched.filter((r) => r.clusterId === c);
      const rev = clusterRevenue.get(c) ?? 0;
      clusters.push({
        clusterId: c,
        label: clusterLabelsById.get(c) ?? "equilibrado",
        skuCount: members.length,
        revenueSharePct: totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0,
      });
    }
  }

  const topSkus = [...enriched]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, UI_TOP_SKUS);

  const llmSummary = buildPortfolioLlmSummary({
    topSkus,
    abcSlices: slices,
    clusters,
    risks,
    ga4MatchCount,
    gscMatchCount,
    skuCount: enriched.length,
  });

  return {
    available: true,
    populationOrders: input.snapshot.populationOrders,
    cappedAtMax: input.snapshot.cappedAtMax,
    skuCount: enriched.length,
    revenueLineTotal: input.snapshot.revenueLineTotal,
    revenueOrderTotal: input.snapshot.revenueOrderTotal,
    reconciliationGapPct,
    abcSlices: slices,
    clusters,
    topSkus,
    risks,
    dataGaps,
    llmSummary,
  };
}
