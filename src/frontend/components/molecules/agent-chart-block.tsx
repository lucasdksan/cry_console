"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import type { AgentChartPart, AgentChartSeries } from "@/backend/lib/agent/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/frontend/components/ui/chart";

type AgentChartBlockProps = {
  part: AgentChartPart;
};

const currencyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const numberFmt = new Intl.NumberFormat("pt-BR");
const pctFmt = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function formatDayLabel(dateYmd: string): string {
  const [, month, day] = dateYmd.split("-");
  return `${day}/${month}`;
}

function formatAxisValue(
  unit: AgentChartSeries["unit"],
  value: number,
): string {
  if (unit === "currency") {
    return currencyFmt.format(value);
  }
  if (unit === "percent") {
    return `${pctFmt.format(value)}%`;
  }
  return numberFmt.format(value);
}

function buildMergedChartData(series: AgentChartSeries[]) {
  const dateSet = new Set<string>();
  for (const row of series) {
    for (const point of row.points) {
      dateSet.add(point.dateYmd);
    }
  }
  const sortedDates = [...dateSet].sort();
  return sortedDates.map((dateYmd) => {
    const row: Record<string, string | number | null> = {
      dateYmd,
      date: formatDayLabel(dateYmd),
    };
    for (const s of series) {
      const point = s.points.find((p) => p.dateYmd === dateYmd);
      row[s.metricKey] = point?.value ?? null;
    }
    return row;
  });
}

function MultiSeriesChart({ part }: { part: AgentChartPart }) {
  const series = part.series ?? [];
  const data = buildMergedChartData(series);
  const hasDualAxis =
    new Set(series.map((s) => s.axis)).size > 1 ||
    new Set(series.map((s) => s.unit)).size > 1;

  const config = Object.fromEntries(
    series.map((s, index) => [
      s.metricKey,
      {
        label: s.label,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
      },
    ]),
  ) satisfies ChartConfig;

  const leftUnit = series.find((s) => s.axis === "left")?.unit ?? series[0]?.unit;
  const rightUnit = series.find((s) => s.axis === "right")?.unit;

  return (
    <ChartContainer config={config} className="aspect-[16/7] w-full min-h-[200px]">
      <LineChart
        accessibilityLayer
        data={data}
        margin={{ left: 8, right: hasDualAxis ? 8 : 8, top: 8, bottom: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={56}
          tickFormatter={(v) =>
            leftUnit ? formatAxisValue(leftUnit, Number(v)) : String(v)
          }
        />
        {hasDualAxis && rightUnit ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={56}
            tickFormatter={(v) => formatAxisValue(rightUnit, Number(v))}
          />
        ) : null}
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                const s = series.find((row) => row.metricKey === name);
                if (!s || value === null || value === undefined) {
                  return null;
                }
                return formatAxisValue(s.unit, Number(value));
              }}
            />
          }
        />
        <Legend />
        {series.map((s, index) => (
          <Line
            key={s.metricKey}
            yAxisId={hasDualAxis ? s.axis : "left"}
            type="monotone"
            dataKey={s.metricKey}
            name={s.label}
            stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={{
              r: 2,
              fill: SERIES_COLORS[index % SERIES_COLORS.length],
              strokeWidth: 0,
            }}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

function LegacySingleChart({ part }: { part: AgentChartPart }) {
  const points = part.points ?? [];
  const data = points.map((point) => ({
    date: formatDayLabel(point.dateYmd),
    value: point.value,
  }));

  const label = part.label ?? part.title;
  const config = {
    value: { label, color: "var(--chart-1)" },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-[16/7] w-full min-h-[200px]">
      <LineChart
        accessibilityLayer
        data={data}
        margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "var(--chart-1)", strokeWidth: 0 }}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}

export function AgentChartBlock({ part }: AgentChartBlockProps) {
  const title = part.title ?? part.label ?? "Gráfico";
  const isMulti = (part.series?.length ?? 0) > 0;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isMulti ? (
          <MultiSeriesChart part={part} />
        ) : (
          <LegacySingleChart part={part} />
        )}
      </CardContent>
    </Card>
  );
}
