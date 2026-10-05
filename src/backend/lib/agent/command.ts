import type { AgentChatMode } from "@/generated/prisma/client";
import { PILLARS, type Pillar } from "@/backend/lib/vtex/registry";
import { PILLAR_TITLES } from "@/backend/lib/analysis/types";

export type AgentWorkspaceCommand =
  | { kind: "health"; pillar?: Pillar }
  | { kind: "chart"; metricHint?: string }
  | { kind: "projection"; metricHint?: string }
  | { kind: "action_plan" }
  | { kind: "funnel" }
  | { kind: "alerts" }
  | { kind: "verdict" }
  | { kind: "ticket" }
  | { kind: "search" };

export type ParsedAgentInput =
  | {
      kind: "mode_only";
      mode: AgentChatMode;
    }
  | {
      kind: "message";
      text: string;
      mode?: AgentChatMode;
      workspaceCommand?: AgentWorkspaceCommand;
    };

export type AgentSlashCatalogEntry = {
  slash: string;
  hint: string;
  chipLabel?: string;
  primaryChip?: boolean;
};

export const AGENT_MODE_SLASH: AgentSlashCatalogEntry[] = [
  { slash: "/agent", hint: "Modo Agent" },
  { slash: "/plan", hint: "Modo Plan" },
  { slash: "/ask", hint: "Modo Ask" },
];

export const AGENT_WORKSPACE_SLASH: AgentSlashCatalogEntry[] = [
  {
    slash: "/saude",
    hint: "Resumo de saúde (opcional: pilar)",
    chipLabel: "Saúde comercial",
    primaryChip: true,
  },
  {
    slash: "/grafico",
    hint: "Tendência de receita ou métrica",
    chipLabel: "Gráfico receita",
    primaryChip: true,
  },
  {
    slash: "/projecao",
    hint: "Série diária com média, desvio e projeção",
    chipLabel: "Projeção receita",
  },
  {
    slash: "/plano",
    hint: "Plano de ação prioritário",
    chipLabel: "Plano de ação",
    primaryChip: true,
  },
  {
    slash: "/aquisicao",
    hint: "Pilar aquisição e sessões GA4",
    chipLabel: "Aquisição",
  },
  {
    slash: "/experiencia",
    hint: "Experiência, Clarity e funil",
    chipLabel: "Experiência",
  },
  {
    slash: "/operacao",
    hint: "Cancelamentos, estoque e logística",
    chipLabel: "Operação",
  },
  {
    slash: "/crescimento",
    hint: "Recompra e alavancas de crescimento",
    chipLabel: "Crescimento",
  },
  {
    slash: "/estrategia",
    hint: "Onde concentrar esforço",
    chipLabel: "Estratégia",
  },
  { slash: "/funil", hint: "Gargalos do funil com números salvos", chipLabel: "Funil" },
  { slash: "/alertas", hint: "Alertas por severidade", chipLabel: "Alertas" },
  { slash: "/veredito", hint: "Veredito executivo salvo", chipLabel: "Veredito" },
  {
    slash: "/ticket",
    hint: "Ticket médio e cancelamento",
    chipLabel: "Ticket",
  },
  {
    slash: "/busca",
    hint: "Busca orgânica (GSC)",
    chipLabel: "Busca orgânica",
  },
];

export const AGENT_SLASH_CATALOG: AgentSlashCatalogEntry[] = [
  ...AGENT_WORKSPACE_SLASH,
  ...AGENT_MODE_SLASH,
];

export const AGENT_PRIMARY_CHIPS = AGENT_WORKSPACE_SLASH.filter(
  (entry) => entry.primaryChip && entry.chipLabel,
);

const MODE_ALIASES: Record<string, AgentChatMode> = {
  agent: "agent",
  plan: "plan",
  ask: "ask",
};

const PILLAR_SLASH: Record<string, Pillar> = {
  aquisicao: "aquisicao",
  comercial: "comercial",
  crescimento: "crescimento",
  estrategia: "estrategica",
  estratégica: "estrategica",
  experiencia: "experiencia",
  experiência: "experiencia",
  operacao: "operacional",
  operação: "operacional",
  operacional: "operacional",
};

const PILLAR_ALIASES: Record<string, Pillar> = Object.fromEntries(
  PILLARS.flatMap((pillar) => [
    [pillar, pillar],
    [PILLAR_TITLES[pillar].toLowerCase(), pillar],
  ]),
) as Record<string, Pillar>;

function normalizeCommandToken(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function parsePillarArg(arg: string | undefined): Pillar | undefined {
  if (!arg) {
    return undefined;
  }
  const key = normalizeCommandToken(arg);
  if (PILLAR_ALIASES[key]) {
    return PILLAR_ALIASES[key];
  }
  for (const pillar of PILLARS) {
    if (key.includes(pillar) || PILLAR_TITLES[pillar].toLowerCase().includes(key)) {
      return pillar;
    }
  }
  return undefined;
}

function healthMessage(pillar: Pillar | undefined, restText: string): string {
  if (restText) {
    return restText;
  }
  if (pillar) {
    return `Resuma a saúde do pilar ${PILLAR_TITLES[pillar]}.`;
  }
  return "Resuma a saúde comercial da loja com base nos pilares disponíveis.";
}

export function parseAgentInput(raw: string): ParsedAgentInput {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { kind: "message", text: "" };
  }

  if (!trimmed.startsWith("/")) {
    return { kind: "message", text: trimmed };
  }

  const withoutSlash = trimmed.slice(1);
  const [commandRaw, ...rest] = withoutSlash.split(/\s+/);
  const command = normalizeCommandToken(commandRaw ?? "");
  const restText = rest.join(" ").trim();

  if (command in MODE_ALIASES) {
    const mode = MODE_ALIASES[command]!;
    if (!restText) {
      return { kind: "mode_only", mode };
    }
    return { kind: "message", text: restText, mode };
  }

  if (command === "saude" || command === "saúde") {
    const pillar = parsePillarArg(rest[0]) ?? parsePillarArg(restText);
    return {
      kind: "message",
      text: healthMessage(pillar, restText),
      workspaceCommand: pillar ? { kind: "health", pillar } : { kind: "health" },
    };
  }

  if (command === "grafico" || command === "gráfico") {
    return {
      kind: "message",
      text:
        restText ||
        "Mostre a tendência de receita e comente os pontos principais.",
      workspaceCommand: { kind: "chart", metricHint: restText || "receita" },
    };
  }

  if (command === "projecao" || command === "projeção") {
    return {
      kind: "message",
      text:
        restText ||
        "Mostre a série diária com média, faixa de desvio e projeção até o fim do mês.",
      workspaceCommand: {
        kind: "projection",
        metricHint: restText || "receita",
      },
    };
  }

  if (command === "plano") {
    return {
      kind: "message",
      text:
        restText ||
        "Monte um plano de ação prioritário com base nos dados disponíveis.",
      workspaceCommand: { kind: "action_plan" },
    };
  }

  const pillarFromSlash = PILLAR_SLASH[command];
  if (pillarFromSlash) {
    return {
      kind: "message",
      text: healthMessage(pillarFromSlash, restText),
      workspaceCommand: { kind: "health", pillar: pillarFromSlash },
    };
  }

  if (command === "funil") {
    return {
      kind: "message",
      text:
        restText ||
        "Identifique gargalos do funil com os números já salvos e sugira ações.",
      workspaceCommand: { kind: "funnel" },
    };
  }

  if (command === "alertas") {
    return {
      kind: "message",
      text:
        restText ||
        "Liste os alertas da loja do mais grave ao mais leve e o que fazer em cada um.",
      workspaceCommand: { kind: "alerts" },
    };
  }

  if (command === "veredito") {
    return {
      kind: "message",
      text:
        restText ||
        "Explique o veredito executivo salvo e a principal alavanca recomendada.",
      workspaceCommand: { kind: "verdict" },
    };
  }

  if (command === "ticket") {
    return {
      kind: "message",
      text:
        restText ||
        "Comente ticket médio, volume de pedidos e taxa de cancelamento com base nos dados salvos.",
      workspaceCommand: { kind: "ticket" },
    };
  }

  if (command === "busca") {
    return {
      kind: "message",
      text:
        restText ||
        "Resuma a performance de busca orgânica e comente a tendência de cliques.",
      workspaceCommand: { kind: "search" },
    };
  }

  return { kind: "message", text: trimmed };
}

export function isWorkspaceCommandBlockedInAsk(
  command: AgentWorkspaceCommand | undefined,
): boolean {
  return command !== undefined;
}

export const ASK_WORKSPACE_BLOCK_MESSAGE =
  "No modo Ask não consultamos dados da loja. Troque para Agent ou Plan para usar comandos como /saude, /grafico ou /plano.";

export function slashSendText(entry: AgentSlashCatalogEntry): string {
  if (entry.slash === "/saude" && entry.primaryChip) {
    return "/saude comercial";
  }
  if (entry.slash === "/grafico" && entry.primaryChip) {
    return "/grafico receita";
  }
  return entry.slash;
}
