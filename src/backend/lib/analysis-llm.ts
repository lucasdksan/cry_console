import {
  AiGenerateError,
  generateTextWithPlatformGemini,
  generateTextWithUserProvider,
} from "@/backend/lib/ai-generate";
import {
  analysisNarrativeJsonSchema,
  type AnalysisMeasurementJson,
  type AnalysisNarrativeJson,
  PILLARS,
} from "@/backend/lib/analysis-types";
import {
  buildLlmPayloadFromMeasurement,
  collectAllowedTargetMetrics,
} from "@/backend/lib/analysis-sanitize";
import type { AiProviderKey } from "@/backend/lib/ai-provider-catalog";
import {
  resolveModelForProvider,
  type AiRouteProviderInput,
} from "@/backend/lib/ai-route";
import type { UserAiProviderCredentials } from "@/backend/models/user-ai-provider.model";

export type AnalysisLlmRoute =
  | {
      kind: "user";
      providerKey: AiProviderKey;
      credentials: UserAiProviderCredentials;
      model: string;
    }
  | { kind: "platform"; model: string };

export type AnalysisLlmResult =
  | { ok: true; narrative: AnalysisNarrativeJson; route: string; providerKey: string | null; model: string }
  | { ok: false; error: string; route?: string; providerKey?: string | null; model?: string };

function buildAnalysisPrompt(payloadJson: string): string {
  return `Você é analista de e-commerce. Com base APENAS no JSON abaixo (scores e alertas já calculados pelo servidor), produza diagnóstico e plano de ação em português do Brasil.

REGRAS OBRIGATÓRIAS:
- Responda SOMENTE com um objeto JSON válido, sem markdown, sem texto extra.
- NÃO altere scores, status ou números de métricas.
- NÃO inclua estimated_revenue_impact nem valores em R$.
- Máximo 3 itens em action_plan por pilar; use [] se o pilar estiver indisponível.
- target_metric deve ser exatamente uma chave presente em metrics do pilar correspondente.
- Inclua exatamente estes pilares: ${PILLARS.join(", ")}.
- executive_verdict: headline, primary_lever, expected_outcome_30d, confidence (alta|media|baixa).

Schema esperado:
{
  "pillars": [
    {
      "pillar": "aquisicao",
      "interpretation": { "summary": "...", "diagnosis": "...", "confidence": "alta|media|baixa" },
      "action_plan": [
        {
          "priority": "alta|media|baixa",
          "title": "...",
          "problem": "...",
          "action": "...",
          "action_steps": ["...", "..."],
          "target_metric": "nome_da_metrica",
          "expected_impact": "qualitativo, sem números de receita"
        }
      ]
    }
  ],
  "executive_verdict": {
    "headline": "...",
    "primary_lever": "...",
    "expected_outcome_30d": "...",
    "confidence": "alta|media|baixa"
  }
}

Dados:
${payloadJson}`;
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

function validateNarrativeAgainstMeasurement(
  narrative: AnalysisNarrativeJson,
  measurement: AnalysisMeasurementJson,
): AnalysisNarrativeJson {
  const allowed = collectAllowedTargetMetrics(measurement);
  const pillarSet = new Set(PILLARS);
  for (const p of narrative.pillars) {
    if (!pillarSet.has(p.pillar)) {
      throw new Error(`Pilar inválido: ${p.pillar}`);
    }
    for (const action of p.action_plan) {
      if (!allowed.has(action.target_metric)) {
        throw new Error(
          `target_metric inválido: ${action.target_metric}`,
        );
      }
      if (/R\$|\breceita\b.*\d|\d+\s*%/i.test(action.expected_impact)) {
        throw new Error("expected_impact não pode conter valores monetários.");
      }
    }
    const card = measurement.pillars.find((c) => c.pillar === p.pillar);
    if (card && !card.available && p.action_plan.length > 0) {
      throw new Error(
        `action_plan deve ser vazio para pilar indisponível: ${p.pillar}`,
      );
    }
  }
  return narrative;
}

async function callModel(
  route: AnalysisLlmRoute,
  prompt: string,
): Promise<string> {
  if (route.kind === "user") {
    return generateTextWithUserProvider(route.credentials, prompt, route.model);
  }
  return generateTextWithPlatformGemini(prompt);
}

export function resolveAnalysisLlmRoute(input: {
  route: import("@/backend/lib/ai-route").AiRouteResult;
  credentials: UserAiProviderCredentials | null;
  providers: AiRouteProviderInput[];
  platformModel: string;
}): AnalysisLlmRoute | { error: string } {
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
      "Análise exige IA no servidor. Configure um provedor em Conta ou GEMINI_API_KEY.",
  };
}

export async function generateAnalysisNarrative(input: {
  measurement: AnalysisMeasurementJson;
  llmRoute: AnalysisLlmRoute;
  maxAttempts?: number;
}): Promise<AnalysisLlmResult> {
  const payload = buildLlmPayloadFromMeasurement(input.measurement);
  const prompt = buildAnalysisPrompt(payload);
  const attempts = input.maxAttempts ?? 2;
  let lastError = "Não foi possível gerar o plano.";

  const routeLabel =
    input.llmRoute.kind === "user" ? "user" : "platform";
  const providerKey =
    input.llmRoute.kind === "user" ? input.llmRoute.providerKey : null;
  const model = input.llmRoute.model;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const raw = await callModel(input.llmRoute, prompt);
      const parsed = analysisNarrativeJsonSchema.parse(
        extractJsonObject(raw),
      );
      const narrative = validateNarrativeAgainstMeasurement(
        parsed,
        input.measurement,
      );
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
