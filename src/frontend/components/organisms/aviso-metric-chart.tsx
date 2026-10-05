"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import type { AvisosMetricCard } from "@/backend/lib/workspace/avisos-dto";
import { Badge } from "@/frontend/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/frontend/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/components/ui/select";

type AvisoMetricChartProps = {
  metrics: AvisosMetricCard[];
  selectedKey: AvisosMetricCard["key"];
  onSelectKey: (key: AvisosMetricCard["key"]) => void;
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

function formatAxisValue(unit: AvisosMetricCard["unit"], value: number): string {
  if (unit === "currency") {
    return currencyFmt.format(value);
  }
  if (unit === "percent") {
    return `${pctFmt.format(value)}%`;
  }
  return numberFmt.format(value);
}

function formatDayLabel(dateYmd: string): string {
  const [, month, day] = dateYmd.split("-");
  return `${day}/${month}`;
}

function hitLabel(status: AvisosMetricCard["targetHitStatus"]): string | null {
  if (status === "reached") {
    return "Atingida";
  }
  if (status === "not_reached") {
    return "Ainda não";
  }
  return null;
}

function hitVariant(
  status: AvisosMetricCard["targetHitStatus"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "reached") {
    return "default";
  }
  if (status === "not_reached") {
    return "destructive";
  }
  return "outline";
}

export function AvisoMetricChart({
  metrics,
  selectedKey,
  onSelectKey,
}: AvisoMetricChartProps) {
  const metric =
    metrics.find((m) => m.key === selectedKey) ?? metrics[0] ?? null;

  if (!metric) {
    return null;
  }

  const chartData = metric.series
    .filter((point) => point.value !== null)
    .map((point) => ({
      dateYmd: point.dateYmd,
      label: formatDayLabel(point.dateYmd),
      value: point.value as number,
    }));

  const chartConfig = {
    value: {
      label: metric.label,
      color: "var(--primary)",
    },
    target: {
      label: "Meta",
      color: "var(--status-untested)",
    },
  } satisfies ChartConfig;

  const hit = hitLabel(metric.targetHitStatus);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Meta no período</CardTitle>
          <CardDescription>
            Curva acumulada e linha da meta — {metric.label}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hit ? (
            <Badge variant={hitVariant(metric.targetHitStatus)}>{hit}</Badge>
          ) : null}
          <Select
            value={metric.key}
            onValueChange={(value) =>
              onSelectKey(value as AvisosMetricCard["key"])
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Métrica" />
            </SelectTrigger>
            <SelectContent>
              {metrics.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem pontos no gráfico para esta métrica. Abra a página após
            configurar as integrações.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={72}
                tickFormatter={(v) =>
                  formatAxisValue(metric.unit, Number(v))
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      formatAxisValue(metric.unit, Number(value))
                    }
                  />
                }
              />
              {metric.target !== null ? (
                <ReferenceLine
                  y={metric.target}
                  stroke="var(--color-target)"
                  strokeDasharray="4 4"
                  label={{
                    value: "Meta",
                    position: "insideTopRight",
                    fill: "var(--muted-foreground)",
                    fontSize: 12,
                  }}
                />
              ) : null}
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
