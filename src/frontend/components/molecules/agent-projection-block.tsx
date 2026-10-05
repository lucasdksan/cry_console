"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts";

import type { AgentProjectionPart } from "@/backend/lib/agent/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/frontend/components/ui/chart";

type AgentProjectionBlockProps = {
  part: AgentProjectionPart;
};

function formatDayLabel(dateYmd: string): string {
  const [, month, day] = dateYmd.split("-");
  return `${day}/${month}`;
}

function formatMetricValue(value: number, isRate: boolean): string {
  if (isRate) {
    return `${value.toFixed(1)}%`;
  }
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
    value,
  );
}

export function AgentProjectionBlock({ part }: AgentProjectionBlockProps) {
  const data = part.points.map((point) => ({
    date: formatDayLabel(point.dateYmd),
    daily: point.dailyValue,
    mean: point.meanLine,
    bandUpper: point.bandUpper,
    bandLower: point.bandLower,
    projectedMean: point.isFuture ? point.meanLine : null,
  }));

  const config = {
    daily: { label: "Dia", color: "var(--chart-1)" },
    mean: { label: "Média", color: "var(--chart-2)" },
    projectedMean: { label: "Projeção (média)", color: "var(--chart-2)" },
    bandUpper: { label: "Faixa +1σ", color: "var(--muted-foreground)" },
  } satisfies ChartConfig;

  const legendParts: string[] = [];
  if (part.mean !== null) {
    legendParts.push(`Média: ${formatMetricValue(part.mean, part.isRateMetric)}`);
  }
  if (part.stdDev !== null) {
    legendParts.push(
      `Desvio: ${formatMetricValue(part.stdDev, part.isRateMetric)}`,
    );
  }
  if (part.projectedMonthTotal !== null) {
    legendParts.push(
      part.isRateMetric
        ? `Referência: média das taxas diárias (${formatMetricValue(part.projectedMonthTotal, true)})`
        : `Projeção mês: ${formatMetricValue(part.projectedMonthTotal, false)}`,
    );
  }
  if (part.outlierDays.length > 0) {
    legendParts.push(
      `Fora da faixa: ${part.outlierDays.map((d) => formatDayLabel(d.dateYmd)).join(", ")}`,
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {part.label} — diário e projeção
        </CardTitle>
        {legendParts.length > 0 ? (
          <p className="text-xs text-muted-foreground">{legendParts.join(" · ")}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-[16/8] w-full min-h-[220px]">
          <ComposedChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} width={52} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {part.mean !== null && part.stdDev !== null ? (
              <ReferenceArea
                y1={part.mean - part.stdDev}
                y2={part.mean + part.stdDev}
                fill="var(--muted)"
                fillOpacity={0.35}
                ifOverflow="extendDomain"
              />
            ) : null}
            <Bar
              dataKey="daily"
              fill="var(--color-daily)"
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="mean"
              stroke="var(--color-mean)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="projectedMean"
              stroke="var(--color-projectedMean)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
