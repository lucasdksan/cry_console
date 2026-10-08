export type AgentKnowledgeChunk = {
  id: string;
  platform: string;
  title: string;
  keywords: string[];
  content: string;
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
];

export interface AgentKnowledgeRetriever {
  search(query: string, limit?: number): AgentKnowledgeChunk[];
}

export class LocalAgentKnowledgeRetriever implements AgentKnowledgeRetriever {
  search(query: string, limit = 4): AgentKnowledgeChunk[] {
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);
    if (tokens.length === 0) {
      return CATALOG.slice(0, limit);
    }

    const scored = CATALOG.map((chunk) => {
      const hay = `${chunk.title} ${chunk.platform} ${chunk.keywords.join(" ")} ${chunk.content}`.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (hay.includes(token)) {
          score += 1;
        }
      }
      return { chunk, score };
    })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((row) => row.chunk);
  }
}

export const defaultAgentKnowledgeRetriever = new LocalAgentKnowledgeRetriever();
