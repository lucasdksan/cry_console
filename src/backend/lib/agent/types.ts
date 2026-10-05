import type { AgentChatMode, AgentModelSource } from "@/generated/prisma/client";
import type { WorkspaceMetricKey } from "@/generated/prisma/client";

export type AgentChartPart = {
  type: "chart";
  metricKey: WorkspaceMetricKey;
  label: string;
  points: { dateYmd: string; value: number | null }[];
};

export type AgentPlanPendingPart = {
  type: "plan_pending";
  markdown: string;
};

export type AgentActionPlanPart = {
  type: "action_plan";
  items: {
    title: string;
    problem: string;
    action: string;
    expectedImpact: string;
  }[];
};

export type AgentMessageParts = {
  parts: (
    | AgentChartPart
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
};
