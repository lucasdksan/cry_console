"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import type { AgentChartPart } from "@/backend/lib/agent/types";
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

function formatDayLabel(dateYmd: string): string {
  const [, month, day] = dateYmd.split("-");
  return `${day}/${month}`;
}

export function AgentChartBlock({ part }: AgentChartBlockProps) {
  const data = part.points.map((point) => ({
    date: formatDayLabel(point.dateYmd),
    value: point.value,
  }));

  const config = {
    value: { label: part.label, color: "var(--primary)" },
  } satisfies ChartConfig;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{part.label}</CardTitle>
      </CardHeader>
      <CardContent>
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
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "var(--primary)", strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
