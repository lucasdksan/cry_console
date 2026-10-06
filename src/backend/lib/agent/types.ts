import type { AgentChatMode, AgentModelSource } from "@/generated/prisma/client";
import type { WorkspaceMetricKey } from "@/generated/prisma/client";

import type { Pillar } from "@/backend/lib/analysis/types";

export type AgentSkillUnitFamily = "currency" | "count" | "percent";

export type AgentChartSeries = {
  metricKey: WorkspaceMetricKey;
  label: string;
  unit: AgentSkillUnitFamily;
  axis: "left" | "right";
  points: { dateYmd: string; value: number | null }[];
};

export type AgentChartPart = {
  type: "chart";
  title: string;
  /** Série única (comandos nativos legados). */
  metricKey?: WorkspaceMetricKey;
  label?: string;
  points?: { dateYmd: string; value: number | null }[];
  /** Skill e comparativos multi-métrica. */
  series?: AgentChartSeries[];
};

export type AgentProjectionPoint = {
  dateYmd: string;
  dailyValue: number | null;
  /** Previsão do dia (só dias futuros após coleta). */
  projectedValue: number | null;
  meanLine: number | null;
  bandUpper: number | null;
  bandLower: number | null;
  isFuture: boolean;
};

export type AgentProjectionForecastMethod = "mean" | "linear_trend";

export type AgentProjectionPart = {
  type: "projection";
  metricKey: WorkspaceMetricKey;
  label: string;
  mean: number | null;
  stdDev: number | null;
  observedTotal: number | null;
  projectedMonthTotal: number | null;
  isRateMetric: boolean;
  forecastMethod: AgentProjectionForecastMethod;
  outlierDays: { dateYmd: string; value: number }[];
  points: AgentProjectionPoint[];
};

export type AgentFunnelStep = {
  label: string;
  value: number;
};

export type AgentFunnelTransition = {
  fromLabel: string;
  toLabel: string;
  passRatePct: number | null;
  dropCount: number;
};

export type AgentFunnelPart = {
  type: "funnel";
  steps: AgentFunnelStep[];
  transitions: AgentFunnelTransition[];
  bottleneckLabel: string | null;
};

export type AgentPlanArtifacts = {
  chartMetrics: WorkspaceMetricKey[];
  projectionMetrics: WorkspaceMetricKey[];
  funnel: boolean;
  actionPlan: boolean;
};

export type AgentPlanPendingPart = {
  type: "plan_pending";
  markdown: string;
  artifacts?: AgentPlanArtifacts;
};

export type AgentActionPlanItem = {
  pillar: Pillar;
  pillarTitle: string;
  priority: "alta" | "media" | "baixa";
  title: string;
  problem: string;
  action: string;
  actionSteps: string[];
  targetMetric: string;
  expectedImpact: string;
};

export type AgentActionPlanPart = {
  type: "action_plan";
  items: AgentActionPlanItem[];
  emptyMessage?: boolean;
};

export type AgentMessageParts = {
  parts: (
    | AgentChartPart
    | AgentProjectionPart
    | AgentFunnelPart
    | AgentPlanPendingPart
    | AgentActionPlanPart
  )[];
};

export type AgentModelChoice =
  | {
      source: Extract<AgentModelSource, "user_provider">;
      providerKey: string;
      model?: string | null;
    }
  | {
      source: Extract<AgentModelSource, "platform">;
      model?: string | null;
    }
  | { source: Extract<AgentModelSource, "browser"> };

export type AgentSessionPublic = {
  id: string;
  title: string;
  mode: AgentChatMode;
  workspaceId: string | null;
  workspaceName: string | null;
  updatedAt: string;
};

export type AgentMessagePublic = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts: AgentMessageParts["parts"];
  modelSource: AgentModelSource | null;
  providerKey: string | null;
  model: string | null;
  createdAt: string;
};

export const AGENT_MODE_META: Record<
  AgentChatMode,
  { label: string; description: string; placeholder: string }
> = {
  agent: {
    label: "Agent",
    description: "Consulta a loja e entrega neste turno.",
    placeholder: "Peça saúde comercial, gráficos ou plano de ação…",
  },
  plan: {
    label: "Plan",
    description: "Monta um plano e espera você aceitar.",
    placeholder: "Descreva o objetivo; revisamos o plano antes de gerar…",
  },
  ask: {
    label: "Ask",
    description: "Tira dúvidas sobre VTEX, GA4, Clarity, GSC e o console.",
    placeholder: "Pergunte sobre integrações e plataformas…",
  },
};

export const CHART_METRIC_LABELS: Record<WorkspaceMetricKey, string> = {
  vtex_revenue: "Receita VTEX",
  vtex_orders: "Pedidos VTEX",
  ga4_sessions: "Sessões GA4",
  ga4_conversion_pct: "Conversão GA4 (%)",
  gsc_clicks: "Cliques GSC",
  clarity_sessions: "Sessões Clarity",
  clarity_dead_clicks: "Dead clicks Clarity",
  clarity_quick_backs: "Quick backs Clarity",
};
