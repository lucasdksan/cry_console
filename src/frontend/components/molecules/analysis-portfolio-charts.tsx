"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import type {
  PortfolioAbcSlice,
  PortfolioClusterGroup,
} from "@/backend/lib/analysis/portfolio/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/frontend/components/ui/chart";

const CHART_CLASS = "aspect-auto h-[220px] w-full min-w-0";

const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const abcConfig = {
  A: { label: "Classe A", color: "var(--chart-1)" },
  B: { label: "Classe B", color: "var(--chart-2)" },
  C: { label: "Classe C", color: "var(--chart-3)" },
} satisfies ChartConfig;

function ChartEmpty({ message }: { message: string }) {
  return (
    <p className="flex h-[220px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

export function AnalysisPortfolioAbcChart({
  slices,
}: {
  slices: PortfolioAbcSlice[];
}) {
  const data = slices
    .map((s) => ({
      class: s.class,
      revenueSharePct: Number(s.revenueSharePct.toFixed(1)),
      skuCount: s.skuCount,
    }))
    .filter((d) => d.skuCount > 0 || d.revenueSharePct > 0);

  if (data.length === 0) {
    return (
      <ChartEmpty message="Sem receita por classe ABC neste período." />
    );
  }

  return (
    <ChartContainer config={abcConfig} className={CHART_CLASS}>
      <BarChart
        accessibilityLayer
        data={data}
        margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis dataKey="class" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          tickFormatter={(v) => `${v}%`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `Classe ${label}`}
              formatter={(value, _name, item) => (
                <span className="tabular-nums">
                  {value}% receita · {item.payload.skuCount} SKUs
                </span>
              )}
            />
          }
        />
        <Bar
          dataKey="revenueSharePct"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        >
          {data.map((entry) => (
            <Cell
              key={entry.class}
              fill={
                abcConfig[entry.class as keyof typeof abcConfig]?.color ??
                SERIES_COLORS[0]
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function shortenLabel(label: string, max = 14): string {
  if (label.length <= max) {
    return label;
  }
  return `${label.slice(0, max - 1)}…`;
}

function buildClusterChartConfig(
  data: { colorKey: string; fullLabel: string }[],
): ChartConfig {
  return Object.fromEntries(
    data.map((row, index) => [
      row.colorKey,
      {
        label: row.fullLabel,
        color: SERIES_COLORS[index % SERIES_COLORS.length]!,
      },
    ]),
  );
}

export function AnalysisPortfolioClustersChart({
  clusters,
}: {
  clusters: PortfolioClusterGroup[];
}) {
  const data = clusters
    .filter((c) => c.skuCount > 0)
    .map((c, index) => ({
      colorKey: `g${index}`,
      label: shortenLabel(c.label),
      fullLabel: c.label,
      revenueSharePct: Number(c.revenueSharePct.toFixed(1)),
      skuCount: c.skuCount,
    }));

  if (data.length === 0) {
    return (
      <ChartEmpty message="Segmentação indisponível: são necessários pelo menos 3 SKUs com receita no período." />
    );
  }

  const clusterConfig = buildClusterChartConfig(data);

  return (
    <ChartContainer config={clusterConfig} className={CHART_CLASS}>
      <BarChart
        accessibilityLayer
        data={data}
        margin={{ left: 4, right: 8, top: 8, bottom: 4 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={52}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          tickFormatter={(v) => `${v}%`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => {
                const row = payload?.[0]?.payload as
                  | { fullLabel?: string }
                  | undefined;
                return row?.fullLabel ?? _label;
              }}
              formatter={(value, _name, item) => (
                <span className="tabular-nums">
                  {value}% receita · {item.payload.skuCount} SKUs
                </span>
              )}
            />
          }
        />
        <Bar dataKey="revenueSharePct" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell
              key={entry.colorKey}
              fill={SERIES_COLORS[index % SERIES_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
