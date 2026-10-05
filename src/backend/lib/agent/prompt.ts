import type { AgentChatMode } from "@/generated/prisma/client";
import {
  buildAskPromptSection,
  buildWorkspacePromptSection,
  type AgentWorkspaceContext,
} from "@/backend/lib/agent/context";
import type { AgentKnowledgeChunk } from "@/backend/lib/agent/knowledge";
import type { AgentWorkspaceCommand } from "@/backend/lib/agent/command";

export const AGENT_RESPONSE_STYLE_HINT =
  "Formate a resposta em prosa curta em português do Brasil. Use listas com hífen quando houver vários pontos. Use negrito (**texto**) só para números ou nomes de métricas. Evite títulos com # e blocos longos de markdown.";

export function buildAgentSystemInstruction(mode: AgentChatMode): string {
  const base =
    "Você é o assistente do Cry Console para gestores de e-commerce. Responda em português do Brasil, de forma clara e acionável.";

  switch (mode) {
    case "ask":
      return `${base} Modo Ask: responda apenas com base nos trechos do catálogo fornecidos. Não invente métricas da loja. ${AGENT_RESPONSE_STYLE_HINT}`;
    case "plan":
      return `${base} Modo Plan: produza um plano em markdown começando com um título #. Não execute ações; o usuário revisará e aceitará o plano. Não invente scores ou valores em R$. Marcadores visuais (quando pedidos): [[chart:metric_key]], [[projection:metric_key]], [[funnel]], [[action_plan]].`;
    case "agent":
    default:
      return `${base} Modo Agent: use somente os dados fornecidos. Não invente scores, métricas ou impacto financeiro em R$. Se faltar dado, diga explicitamente. Marcadores visuais: [[chart:metric_key]], [[projection:metric_key]], [[funnel]], [[action_plan]]. ${AGENT_RESPONSE_STYLE_HINT}`;
  }
}

export function buildAgentPrompt(input: {
  mode: AgentChatMode;
  userMessage: string;
  workspaceContext?: AgentWorkspaceContext | null;
  workspaceCommand?: AgentWorkspaceCommand;
  knowledgeChunks?: AgentKnowledgeChunk[];
  history: { role: "user" | "assistant"; content: string }[];
  approvedPlanMarkdown?: string;
}): string {
  const sections: string[] = [buildAgentSystemInstruction(input.mode)];

  if (input.mode === "ask") {
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
  } else {
    sections.push("## Dados da loja\nNenhum workspace vinculado a esta sessão.");
  }

  if (input.approvedPlanMarkdown) {
    sections.push(
      "## Plano aceito pelo usuário",
      input.approvedPlanMarkdown,
      "Gere a entrega final: texto acionável e, se pedido, use [[chart:vtex_revenue]] ou outra métrica disponível.",
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
