"use client";

import type { AnalysisPortfolioJson } from "@/backend/lib/analysis/portfolio/types";
import {
  AnalysisPortfolioAbcChart,
  AnalysisPortfolioClustersChart,
} from "@/frontend/components/molecules/analysis-portfolio-charts";
import { AnalysisPortfolioSkuList } from "@/frontend/components/molecules/analysis-portfolio-sku-list";
import { Alert, AlertDescription, AlertTitle } from "@/frontend/components/ui/alert";
import { Badge } from "@/frontend/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/frontend/components/ui/empty";
import {
  formatAnalysisMetricValue,
  formatPtCurrency,
  formatPtInteger,
} from "@/frontend/lib/format-analysis-metric";

type AnalysisPortfolioTabProps = {
  portfolio: AnalysisPortfolioJson | undefined;
};

export function AnalysisPortfolioTab({ portfolio }: AnalysisPortfolioTabProps) {
  if (!portfolio?.available) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Portfólio indisponível</EmptyTitle>
          <EmptyDescription>
            Gere a análise de novo para calcular vendas por SKU, curva ABC e
            segmentos de SKU com cruzamento GA4 e Search Console quando
            configurados.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const segmentsGap = portfolio.dataGaps.find((g) =>
    /segmentação|segmentos/i.test(g.reason),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">SKUs</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatPtInteger(portfolio.skuCount)}
          </p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Pedidos</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatPtInteger(portfolio.populationOrders)}
          </p>
        </div>
        <div className="col-span-2 rounded-lg border bg-card px-3 py-2 sm:col-span-2">
          <p className="text-xs text-muted-foreground">Receita (linhas VTEX)</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatPtCurrency(portfolio.revenueLineTotal)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Curva ABC</CardTitle>
            <CardDescription className="text-xs">
              Quanto da receita cada classe concentra
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <AnalysisPortfolioAbcChart slices={portfolio.abcSlices} />
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Segmentos</CardTitle>
            <CardDescription className="text-xs">
              Agrupamento por receita, volume, cancelamento e pedidos
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <AnalysisPortfolioClustersChart clusters={portfolio.clusters} />
            {segmentsGap && portfolio.clusters.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">{segmentsGap.reason}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {portfolio.risks.length > 0 ? (
        <Alert className="border-destructive/40 bg-card">
          <AlertTitle className="text-sm text-foreground">
            Risco de cancelamento
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-1 flex flex-col gap-1.5 text-sm text-muted-foreground">
              {portfolio.risks.slice(0, 4).map((r) => (
                <li key={r.key} className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground">{r.name}</span>
                  <Badge
                    variant={r.level === "critico" ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {formatAnalysisMetricValue("cancel_rate_pct", r.cancelRatePct)} ·{" "}
                    {r.level}
                  </Badge>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-medium">
                Ranking por receita
              </CardTitle>
              <CardDescription className="text-xs">
                VTEX como fonte de receita; GA4 e GSC quando houver match
              </CardDescription>
            </div>
            {portfolio.cappedAtMax ? (
              <Badge variant="outline" className="text-xs">
                Amostra 10k pedidos
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <AnalysisPortfolioSkuList skus={portfolio.topSkus} />
        </CardContent>
      </Card>

      {portfolio.dataGaps.length > 0 ? (
        <details className="rounded-lg border px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium text-muted-foreground">
            Lacunas do portfólio ({portfolio.dataGaps.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2 border-t pt-2">
            {portfolio.dataGaps.map((gap, i) => (
              <li key={`${gap.source}-${i}`}>
                <Badge variant="outline" className="mr-2 text-[10px]">
                  {gap.source}
                </Badge>
                {gap.reason}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
