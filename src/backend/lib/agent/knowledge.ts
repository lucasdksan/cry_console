import {
  buildAskKnowledgeSearchQueries,
  isVtexAdminNavigationQuery,
} from "@/backend/lib/agent/ask-knowledge-query";
import { isHelpCenterPineconeConfigured } from "@/backend/lib/agent/help-center-config";
import { searchHelpCenterChunks } from "@/backend/lib/agent/help-center-pinecone";
import type { HelpCenterChunk } from "@/backend/lib/agent/help-center-types";

export type AgentKnowledgeChunk = {
  id: string;
  platform: string;
  title: string;
  keywords: string[];
  content: string;
  section?: string;
  url?: string;
};

const CATALOG: AgentKnowledgeChunk[] = [
  {
    id: "vtex-orders",
    platform: "VTEX",
    title: "Pedidos e OMS",
    keywords: ["vtex", "pedido", "oms", "order"],
    content:
      "No Cry Console, pedidos VTEX entram via credenciais App Key e App Token do workspace. A coleta alimenta métricas de receita e pedidos e a análise de saúde comercial. Configure em Workspaces → Configurações.",
  },
  {
    id: "ga4",
    platform: "Google Analytics 4",
    title: "GA4 e propriedade",
    keywords: ["ga4", "analytics", "sessão", "conversão"],
    content:
      "GA4 exige service account JSON e Property ID no workspace. Métricas de sessões e conversão aparecem na visão geral e nos avisos quando a coleta está ok.",
  },
  {
    id: "gsc",
    platform: "Google Search Console",
    title: "Cliques orgânicos",
    keywords: ["gsc", "search console", "clique", "seo"],
    content:
      "Search Console usa a mesma service account do GA4. Cliques orgânicos alimentam metas e gráficos quando o site está verificado na propriedade.",
  },
  {
    id: "clarity",
    platform: "Microsoft Clarity",
    title: "Experiência e sessões",
    keywords: ["clarity", "experiência", "heatmap"],
    content:
      "Clarity usa token de projeto no workspace. Snapshots recentes entram na análise de experiência quando disponíveis.",
  },
  {
    id: "console-agent",
    platform: "Cry Console",
    title: "Modos Agent, Plan e Ask",
    keywords: ["agent", "plan", "ask", "modo", "console"],
    content:
      "Agent consulta dados já salvos da loja (métricas e análise). Plan propõe um plano em markdown para você aceitar antes de gerar entregáveis. Ask responde sobre plataformas e, na sessão com loja, também lê erros e Web Vitals do Sentry — sem receita, GA4, GSC ou Clarity.",
  },
  {
    id: "console-observability",
    platform: "Cry Console",
    title: "Observabilidade Sentry",
    keywords: [
      "sentry",
      "observabilidade",
      "erro",
      "javascript",
      "vitals",
      "lcp",
      "replay",
      "tunnel",
    ],
    content:
      "Cada loja pode ter um projeto Sentry provisionado pelo Cry Console. O script e o tunnel (/api/observability) enviam eventos com tag page_type (home, plp, pdp). O quadro Observabilidade lista issues, Web Vitals e replays. No Agente, a seção Observabilidade (Sentry) resume esses dados para análise em Agent, Plan e Ask.",
  },
  {
    id: "console-workspace",
    platform: "Cry Console",
    title: "Workspaces",
    keywords: ["workspace", "loja", "limite"],
    content:
      "Cada conta pode ter até três workspaces. Cada workspace isola credenciais, métricas e análise. Sessões do Agente ficam presas ao workspace escolhido na criação.",
  },
  {
    id: "ai-providers",
    platform: "Cry Console",
    title: "Modelos de IA",
    keywords: ["modelo", "openai", "deepseek", "gemini", "provedor"],
    content:
      "Cadastre provedores (OpenAI, Gemini, Grok, Anthropic, DeepSeek ou outro) nas configurações da conta com o token da API; escolha o modelo no seletor do chat do Agente. Também há o Gemini da plataforma (quando configurado) e o modelo nativo do Chrome via Prompt API.",
  },
  {
    id: "vtex-admin-nav",
    platform: "VTEX",
    title: "Navegação no Admin VTEX (operacional)",
    keywords: [
      "admin",
      "vtex",
      "myvtex",
      "menu",
      "navegação",
      "navegar",
      "onde",
      "como acesso",
      "painel",
      "legacy",
      "operacional",
      "pedido",
      "catálogo",
    ],
    content:
      "O Admin VTEX (painel operacional da conta) costuma ser acessado em {conta}.myvtex.com/admin após login. A interface atual organiza módulos no menu lateral e na busca global do topo; tutoriais oficiais ficam em help.vtex.com na trilha Tutoriais > Admin VTEX (ex.: admin-vtex-comece-aqui). Para perguntas de “como chegar”, combine essa estrutura com o artigo recuperado do Help Center — pedidos, catálogo, promoções, frete e configurações de loja seguem esse admin, não o fluxo de desenvolvimento VTEX IO.",
  },
  {
    id: "vtex-io-admin-nav",
    platform: "VTEX",
    title: "Navegação VTEX IO no Admin",
    keywords: [
      "vtex io",
      "vtexio",
      "io",
      "apps",
      "app",
      "cms",
      "site editor",
      "storefront",
      "tema",
      "theme",
      "desenvolvimento",
    ],
    content:
      "Fluxos de VTEX IO (loja headless, apps instalados, CMS e Site Editor) também partem do Admin VTEX logado na conta, mas os caminhos citados na documentação apontam para áreas como Apps, CMS/Site Editor e trilhas vtex-io no Help Center — distintos do menu operacional de pedidos e catálogo legacy. Ao montar tutorial de navegação para IO, priorize trechos que mencionem Site Editor, apps, CMS ou tracks cms-vtex-io.",
  },
];

export interface AgentKnowledgeRetriever {
  search(query: string, limit?: number): Promise<AgentKnowledgeChunk[]>;
}

function mapHelpCenterChunkToAgent(chunk: HelpCenterChunk): AgentKnowledgeChunk {
  return {
    id: chunk.id,
    platform: "VTEX Help Center",
    title: chunk.title,
    keywords: [chunk.source, "vtex", "help center"],
    content: chunk.content,
    section: chunk.section,
    url: chunk.url,
  };
}

function scoreCatalogChunk(chunk: AgentKnowledgeChunk, tokens: string[]): number {
  const hay =
    `${chunk.title} ${chunk.platform} ${chunk.keywords.join(" ")} ${chunk.content}`.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (hay.includes(token)) {
      score += 1;
    }
  }
  return score;
}

function mergeKnowledgeChunksById(
  chunks: AgentKnowledgeChunk[],
  limit: number,
): AgentKnowledgeChunk[] {
  const byId = new Map<string, AgentKnowledgeChunk>();
  for (const chunk of chunks) {
    if (!byId.has(chunk.id)) {
      byId.set(chunk.id, chunk);
    }
  }
  return [...byId.values()].slice(0, limit);
}

export class LocalAgentKnowledgeRetriever implements AgentKnowledgeRetriever {
  async search(query: string, limit = 4): Promise<AgentKnowledgeChunk[]> {
    const searchQueries = buildAskKnowledgeSearchQueries(query);
    const tokenSet = new Set<string>();
    for (const q of searchQueries) {
      for (const token of q.toLowerCase().split(/\s+/)) {
        if (token.length > 2) {
          tokenSet.add(token);
        }
      }
    }
    const tokens = [...tokenSet];
    if (tokens.length === 0) {
      return CATALOG.slice(0, limit);
    }

    const scored = CATALOG.map((chunk) => ({
      chunk,
      score: scoreCatalogChunk(chunk, tokens),
    }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);

    const effectiveLimit = isVtexAdminNavigationQuery(query)
      ? Math.max(limit, 6)
      : limit;

    return mergeKnowledgeChunksById(
      scored.map((row) => row.chunk),
      effectiveLimit,
    );
  }
}

async function searchHelpCenterForAskQueries(
  query: string,
  limit: number,
): Promise<AgentKnowledgeChunk[]> {
  const queries = buildAskKnowledgeSearchQueries(query);
  const perQueryLimit = Math.max(4, Math.ceil(limit / queries.length) + 2);
  const merged: AgentKnowledgeChunk[] = [];

  for (const q of queries) {
    const chunks = await searchHelpCenterChunks(q, perQueryLimit);
    merged.push(...chunks.map(mapHelpCenterChunkToAgent));
  }

  return mergeKnowledgeChunksById(merged, limit);
}

export class PineconeAgentKnowledgeRetriever implements AgentKnowledgeRetriever {
  constructor(private readonly fallback: LocalAgentKnowledgeRetriever) {}

  async search(query: string, limit = 6): Promise<AgentKnowledgeChunk[]> {
    const effectiveLimit = isVtexAdminNavigationQuery(query)
      ? Math.max(limit, 8)
      : limit;

    if (!isHelpCenterPineconeConfigured()) {
      return this.fallback.search(query, effectiveLimit);
    }
    try {
      const chunks = await searchHelpCenterForAskQueries(query, effectiveLimit);
      if (chunks.length === 0) {
        return this.fallback.search(query, effectiveLimit);
      }
      const catalog = await this.fallback.search(query, 2);
      return mergeKnowledgeChunksById([...chunks, ...catalog], effectiveLimit);
    } catch {
      return this.fallback.search(query, effectiveLimit);
    }
  }
}

const localAgentKnowledgeRetriever = new LocalAgentKnowledgeRetriever();

export const defaultAgentKnowledgeRetriever = new PineconeAgentKnowledgeRetriever(
  localAgentKnowledgeRetriever,
);

export async function searchAgentKnowledge(
  query: string,
  limit = 6,
): Promise<AgentKnowledgeChunk[]> {
  return defaultAgentKnowledgeRetriever.search(query, limit);
}
