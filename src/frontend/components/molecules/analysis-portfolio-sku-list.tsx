"use client";

import { useState } from "react";

import type { PortfolioSkuEntry } from "@/backend/lib/analysis/portfolio/types";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
  formatGscPosition,
  formatPtInteger,
} from "@/frontend/lib/format-analysis-metric";

const INITIAL_VISIBLE = 8;

function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

type AnalysisPortfolioSkuListProps = {
  skus: PortfolioSkuEntry[];
};

export function AnalysisPortfolioSkuList({ skus }: AnalysisPortfolioSkuListProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? skus : skus.slice(0, INITIAL_VISIBLE);

  if (skus.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum SKU ranqueado.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-2 py-2 font-medium">Produto</th>
              <th className="px-2 py-2 font-medium text-right">Receita</th>
              <th className="hidden px-2 py-2 font-medium sm:table-cell">
                Sinais
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((sku) => (
              <tr key={sku.key} className="border-b border-border/60 align-top">
                <td className="max-w-[200px] px-2 py-2.5 sm:max-w-none">
                  <p className="line-clamp-2 font-medium leading-snug">
                    {sku.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {sku.abcClass}
                    </Badge>
                    {sku.clusterLabel ? (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {sku.clusterLabel}
                      </Badge>
                    ) : null}
                    {sku.riskLevel ? (
                      <Badge
                        variant="destructive"
                        className="text-[10px] px-1.5 py-0"
                      >
                        cancel.
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                    {sku.quantity} un. · {sku.orderCount} ped.
                    {sku.ga4 ? ` · GA4 ${sku.ga4.items_viewed} views` : ""}
                    {sku.gsc
                      ? ` · GSC ${formatPtInteger(sku.gsc.clicks)} cliques`
                      : ""}
                  </p>
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums">
                  {formatBrl(sku.revenue)}
                  <p className="text-xs text-muted-foreground">
                    {sku.quantity} un.
                  </p>
                </td>
                <td className="hidden px-2 py-2.5 text-xs text-muted-foreground sm:table-cell">
                  <ul className="flex flex-col gap-0.5">
                    <li>VTEX · {sku.orderCount} ped.</li>
                    {sku.ga4 ? (
                      <li>
                        GA4 · {sku.ga4.items_viewed} views /{" "}
                        {sku.ga4.items_purchased} compras
                      </li>
                    ) : null}
                    {sku.gsc ? (
                      <li>
                        GSC · {formatPtInteger(sku.gsc.clicks)} cliques · pos.{" "}
                        {formatGscPosition(sku.gsc.position)}
                      </li>
                    ) : null}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {skus.length > INITIAL_VISIBLE ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? "Mostrar menos"
            : `Ver mais ${skus.length - INITIAL_VISIBLE} SKUs`}
        </Button>
      ) : null}
    </div>
  );
}
