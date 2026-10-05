import {
  AiGenerateError,
  generateTextWithPlatformGemini,
  generateTextWithUserProvider,
} from "@/backend/lib/ai/generate";
import type { AiProviderKey } from "@/backend/lib/ai/provider-catalog";
import {
  resolveModelForProvider,
  type AiRouteResult,
  type AiRouteProviderInput,
} from "@/backend/lib/ai/route";
import {
  pageAuditNarrativeJsonSchema,
  type PageAuditNarrativeJson,
  type PageAuditReportJson,
} from "@/backend/lib/page-audit/types";
import type { UserAiProviderCredentials } from "@/backend/models/user-ai-provider.model";

export type PageAuditLlmRoute =
  | {
      kind: "user";
      providerKey: AiProviderKey;
      credentials: UserAiProviderCredentials;
      model: string;
    }
  | { kind: "platform"; model: string };

export type PageAuditLlmResult =
  | {
      ok: true;
      narrative: PageAuditNarrativeJson;
      route: string;
      providerKey: string | null;
      model: string;
    }
  | { ok: false; error: string; route?: string; providerKey?: string | null; model?: string };

function buildPrompt(report: PageAuditReportJson): string {
  const payload = {
    url: report.url,
    seo: {
      healthScore: report.seo.healthScore,
      summary: report.seo.summary,
      topFindings: report.seo.findings.slice(0, 8).map((f) => ({
        id: f.id,
        severity: f.severity,
        title: f.title,
      })),
    },
    cro: {
      experienceScore: report.cro.experienceScore,
      heuristicScores: report.cro.heuristicScores,
      flags: report.cro.diagnosticFlags,
    },
    pagespeed: report.pagespeed,
    storeContext: report.storeContext,
  };

  return `Você é analista de e-commerce. Com base APENAS no JSON abaixo (achados já calculados pelo servidor), produza um resumo curto em português do Brasil.

REGRAS:
- Responda SOMENTE com JSON válido, sem markdown.
- summary: 2–4 frases integrando SEO on-page e conversão.
- seoPriorities: até 3 bullets acionáveis focados em SEO.
- croPriorities: até 3 bullets acionáveis focados em CRO/conversão.
- confidence: alta|media|baixa conforme completude dos dados (html/pagespeed/store).

Schema:
{
  "summary": "...",
  "seoPriorities": ["..."],
  "croPriorities": ["..."],
  "confidence": "alta|media|baixa"
}

Dados:
${JSON.stringify(payload)}`;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1]!.trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Resposta sem JSON.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

async function callModel(route: PageAuditLlmRoute, prompt: string): Promise<string> {
  if (route.kind === "user") {
    return generateTextWithUserProvider(route.credentials, prompt, route.model);
  }
  return generateTextWithPlatformGemini(prompt);
}

export function resolvePageAuditLlmRoute(input: {
  route: AiRouteResult;
  credentials: UserAiProviderCredentials | null;
  providers: AiRouteProviderInput[];
  platformModel: string;
}): PageAuditLlmRoute | { error: string } {
  const { route } = input;
  if (route.kind === "error") {
    return { error: route.message };
  }
  if (route.kind === "user") {
    if (!input.credentials) {
      return { error: "Credenciais do provedor indisponíveis." };
    }
    const model = resolveModelForProvider(
      route.providerKey,
      input.credentials.defaultModel,
      null,
    );
    if (!model) {
      return { error: "Configure um modelo para o provedor de IA." };
    }
    return {
      kind: "user",
      providerKey: route.providerKey,
      credentials: input.credentials,
      model,
    };
  }
  if (route.kind === "platform-gemini") {
    return { kind: "platform", model: input.platformModel };
  }
  return {
    error:
      "Auditoria exige IA no servidor. Configure um provedor em Conta ou GEMINI_API_KEY.",
  };
}

export async function generatePageAuditNarrative(input: {
  report: PageAuditReportJson;
  llmRoute: PageAuditLlmRoute;
  maxAttempts?: number;
}): Promise<PageAuditLlmResult> {
  const prompt = buildPrompt(input.report);
  const attempts = input.maxAttempts ?? 2;
  let lastError = "Não foi possível gerar o resumo.";

  const routeLabel = input.llmRoute.kind === "user" ? "user" : "platform";
  const providerKey =
    input.llmRoute.kind === "user" ? input.llmRoute.providerKey : null;
  const model = input.llmRoute.model;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const raw = await callModel(input.llmRoute, prompt);
      const narrative = pageAuditNarrativeJsonSchema.parse(extractJsonObject(raw));
      return {
        ok: true,
        narrative,
        route: routeLabel,
        providerKey,
        model,
      };
    } catch (error) {
      if (error instanceof AiGenerateError) {
        lastError = error.message;
      } else if (error instanceof Error) {
        lastError = error.message;
      }
    }
  }

  return {
    ok: false,
    error: lastError,
    route: routeLabel,
    providerKey,
    model,
  };
}
