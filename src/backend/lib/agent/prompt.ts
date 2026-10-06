import type { AgentChatMode } from "@/generated/prisma/client";
import {
  buildAskPromptSection,
  buildWorkspacePromptSection,
  type AgentWorkspaceContext,
} from "@/backend/lib/agent/context";
import type { AgentKnowledgeChunk } from "@/backend/lib/agent/knowledge";
import type { AgentWorkspaceCommand } from "@/backend/lib/agent/command";
import type { PlanConversationPhase } from "@/backend/lib/agent/plan-turn";
import { resolvePlanConversationPhase } from "@/backend/lib/agent/plan-turn";

export const AGENT_RESPONSE_STYLE_HINT =
  "Formate a resposta em prosa curta em português do Brasil. Use listas com hífen quando houver vários pontos. Use negrito (**texto**) só para números ou nomes de métricas. Evite títulos com # e blocos longos de markdown.";

export function buildAgentSystemInstruction(mode: AgentChatMode): string {
  const base =
    "Você é o assistente do Cry Console para gestores de e-commerce. Responda em português do Brasil, de forma clara e acionável.";

  switch (mode) {
    case "ask":
      return `${base} Modo Ask: responda apenas com base nos trechos do catálogo fornecidos. Não invente métricas da loja. ${AGENT_RESPONSE_STYLE_HINT}`;
    case "plan":
      return `${base} Modo Plan: o usuário revisa e aceita o plano antes da entrega. Não execute ações neste modo. Não invente scores ou valores em R$. Não use marcadores visuais ([[chart]], [[projection]], [[funnel]], [[action_plan]]) no modo Plan — eles serão gerados só após o aceite.`;
    case "agent":
    default:
      return `${base} Modo Agent: use somente os dados fornecidos. Não invente scores, métricas ou impacto financeiro em R$. Se faltar dado, diga explicitamente. Marcadores visuais: [[chart:metric_key]], [[projection:metric_key]], [[funnel]], [[action_plan]]. ${AGENT_RESPONSE_STYLE_HINT}`;
  }
}

const AGENT_SKILL_TURN_HINT =
  "Turno de skill: o sistema já anexou o gráfico configurado (se houver séries no período). Não use marcadores [[chart]], [[projection]], [[funnel]] ou [[action_plan]]. Responda seguindo a instrução da skill e os dados da loja.";

function buildPlanPhaseHint(
  phase: PlanConversationPhase,
): string {
  if (phase === "discovery") {
    return [
      "Fase de descoberta (primeiro turno ou ainda sem respostas do usuário):",
      "Comece com 1–2 frases de contexto, depois de 2 a 4 perguntas no formato exato:",
      "## Pergunta: {texto da pergunta}",
      "- {sugestão 1}",
      "- {sugestão 2}",
      "- {sugestão 3}",
      "Repita o bloco para cada pergunta (horizonte, canal, restrições, métrica-alvo).",
      "Não use título # nem seções de plano; não inclua diagnóstico longo nem marcadores visuais.",
    ].join(" ");
  }
  return [
    "Fase de overview (usuário já respondeu às perguntas):",
    "Produza um plano em markdown começando com um título #.",
    "Inclua as seções ## Overview, ## Diagnóstico, ## Passos e ## Entrega prevista.",
    "Em ## Passos, organize por Semana N (Dias X–Y): título da fase; em linhas separadas use Ação N.N: descrição (sem negrito **).",
    "Em ## Entrega prevista, descreva em texto o que será gerado após o aceite (cards, gráficos, funil, projeção).",
    "Não use marcadores [[chart]], [[projection]], [[funnel]] ou [[action_plan]] nesta fase.",
  ].join(" ");
}

export function buildAgentPrompt(input: {
  mode: AgentChatMode;
  userMessage: string;
  workspaceContext?: AgentWorkspaceContext | null;
  workspaceCommand?: AgentWorkspaceCommand;
  knowledgeChunks?: AgentKnowledgeChunk[];
  history: { role: "user" | "assistant"; content: string }[];
  approvedPlanMarkdown?: string;
  agentSkill?: { instruction: string; digest: string } | null;
  planPhase?: PlanConversationPhase;
}): string {
  const skillTurn = input.agentSkill ?? null;
  let systemInstruction = buildAgentSystemInstruction(input.mode);
  if (skillTurn) {
    systemInstruction = `${systemInstruction} ${AGENT_SKILL_TURN_HINT}`;
  }
  if (input.mode === "plan" && !skillTurn && !input.approvedPlanMarkdown) {
    const phase =
      input.planPhase ?? resolvePlanConversationPhase(input.history);
    systemInstruction = `${systemInstruction} ${buildPlanPhaseHint(phase)}`;
  }
  const sections: string[] = [systemInstruction];

  if (input.mode === "ask" && !skillTurn) {
    sections.push(
      "## Catálogo (fonte única)",
      buildAskPromptSection(
        (input.knowledgeChunks ?? []).map((c) => ({
          title: `${c.platform} — ${c.title}`,
          content: c.content,
        })),
      ),
    );
  } else if (input.workspaceContext) {
    sections.push(
      "## Dados da loja",
      buildWorkspacePromptSection(
        input.workspaceContext,
        input.workspaceCommand,
      ),
    );
  } else if (!skillTurn) {
    sections.push("## Dados da loja\nNenhum workspace vinculado a esta sessão.");
  } else {
    sections.push("## Dados da loja\nNenhum workspace vinculado a esta sessão.");
  }

  if (skillTurn) {
    sections.push(
      "## Skill do usuário",
      skillTurn.instruction,
      "## Contexto da skill",
      skillTurn.digest,
    );
  }

  if (input.approvedPlanMarkdown) {
    sections.push(
      "## Plano aceito pelo usuário",
      input.approvedPlanMarkdown,
      [
        "Gere a entrega final em modo Agent: texto acionável em prosa.",
        "Inclua marcadores visuais quando fizer sentido com os dados disponíveis:",
        "[[chart:metric_key]], [[projection:metric_key]] (só se houver série), [[funnel]], [[action_plan]].",
        "Priorize métricas citadas no plano; use vtex_revenue ou ga4_conversion_pct se não houver outra.",
      ].join(" "),
    );
  }

  if (input.history.length > 0) {
    sections.push("## Histórico recente");
    for (const msg of input.history.slice(-8)) {
      sections.push(`${msg.role === "user" ? "Usuário" : "Assistente"}: ${msg.content}`);
    }
  }

  sections.push("## Mensagem atual", input.userMessage);

  return sections.join("\n\n");
}

export function isValidPlanMarkdown(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("#") && trimmed.length > 20;
}
