import type {
  AnalysisPortfolioJson,
  PortfolioClusterGroup,
  PortfolioRiskEntry,
  PortfolioSkuEntry,
} from "@/backend/lib/analysis/portfolio/types";

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function buildPortfolioLlmSummary(input: {
  topSkus: PortfolioSkuEntry[];
  abcSlices: AnalysisPortfolioJson["abcSlices"];
  clusters: PortfolioClusterGroup[];
  risks: PortfolioRiskEntry[];
  ga4MatchCount: number;
  gscMatchCount: number;
  skuCount: number;
}): string {
  const lines: string[] = ["Portfólio VTEX (30 dias, fonte: vtex):"];

  const abcLine = input.abcSlices
    .map(
      (s) =>
        `${s.class}: ${s.skuCount} SKUs, ${s.revenueSharePct.toFixed(0)}% receita`,
    )
    .join("; ");
  lines.push(`Curva ABC: ${abcLine}.`);

  if (input.clusters.length > 0) {
    const clusterLine = input.clusters
      .map(
        (c) =>
          `${c.label} (${c.skuCount} SKUs, ${c.revenueSharePct.toFixed(0)}% receita)`,
      )
      .join("; ");
    lines.push(`Segmentos de SKU: ${clusterLine}.`);
  }

  if (input.risks.length > 0) {
    const riskLine = input.risks
      .slice(0, 5)
      .map((r) => `${r.name} (${r.level}, ${r.cancelRatePct.toFixed(0)}% cancel.)`)
      .join("; ");
    lines.push(`Riscos de cancelamento: ${riskLine}.`);
  }

  const top = input.topSkus.slice(0, 8);
  if (top.length > 0) {
    lines.push("Top SKUs por receita (vtex):");
    for (const sku of top) {
      let line = `- ${sku.name}: ${formatMoney(sku.revenue)}, ${sku.quantity} un., ABC ${sku.abcClass}`;
      if (sku.ga4) {
        line += `; ga4: ${sku.ga4.items_viewed} views, ${sku.ga4.items_purchased} compras`;
      }
      if (sku.gsc) {
        line += `; gsc: ${sku.gsc.clicks} cliques, pos. ${sku.gsc.position.toFixed(1)}`;
      }
      lines.push(line);
    }
  }

  if (input.ga4MatchCount === 0 && input.skuCount > 0) {
    lines.push(
      "Cruzamento GA4: nenhum itemId bateu com skuId/productId (fonte: ga4).",
    );
  } else if (input.ga4MatchCount > 0) {
    lines.push(
      `Cruzamento GA4: ${input.ga4MatchCount} SKUs com sinal (fonte: ga4).`,
    );
  }

  if (input.gscMatchCount > 0) {
    lines.push(
      `Cruzamento Search Console: ${input.gscMatchCount} SKUs com PDP indexada (fonte: gsc).`,
    );
  }

  return lines.join("\n");
}
