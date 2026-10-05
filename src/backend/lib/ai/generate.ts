import { GoogleGenAI } from "@google/genai";

import type { AiProviderKey } from "@/backend/lib/ai/provider-catalog";
import {
  readPlatformGeminiConfig,
} from "@/backend/lib/ai/platform-config";
import { resolveModelForProvider } from "@/backend/lib/ai/route";
import { humanizeAiErrorInput } from "@/backend/lib/ai/error-message";
import type { UserAiProviderCredentials } from "@/backend/models/user-ai-provider.model";

const OPENAI_COMPAT_BASE: Partial<Record<AiProviderKey, string>> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
};

export class AiGenerateError extends Error {
  readonly retryable: boolean;
  readonly httpStatus?: number;

  constructor(
    message: string,
    options?: { retryable?: boolean; httpStatus?: number },
  ) {
    super(message);
    this.name = "AiGenerateError";
    this.retryable = options?.retryable ?? false;
    this.httpStatus = options?.httpStatus;
  }

  static fromRaw(raw: string, httpStatus?: number): AiGenerateError {
    const humanized = humanizeAiErrorInput({ raw, httpStatus });
    return new AiGenerateError(humanized.message, {
      retryable: humanized.retryable,
      httpStatus: humanized.httpStatus,
    });
  }
}

async function throwAiGenerateErrorFromResponse(
  response: Response,
): Promise<never> {
  const text = await response.text();
  throw AiGenerateError.fromRaw(text || `HTTP ${response.status}`, response.status);
}

function geminiEmptyResponseMessage(response: {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string }[];
}): string {
  const blockReason = response.promptFeedback?.blockReason;
  if (blockReason) {
    return `O Gemini bloqueou o prompt (${blockReason}).`;
  }
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason) {
    return `O Gemini não gerou texto (motivo: ${finishReason}).`;
  }
  return "O modelo não retornou texto.";
}

function toAiGenerateError(error: unknown, fallback: string): AiGenerateError {
  if (error instanceof AiGenerateError) {
    return error;
  }
  if (error instanceof Error && error.message.trim()) {
    return AiGenerateError.fromRaw(error.message.trim());
  }
  if (typeof error === "string" && error.trim()) {
    return AiGenerateError.fromRaw(error.trim());
  }
  return new AiGenerateError(fallback);
}

async function generateWithGeminiApi(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    const text = response.text?.trim();
    if (!text) {
      throw new AiGenerateError(geminiEmptyResponseMessage(response));
    }
    return text;
  } catch (error) {
    throw toAiGenerateError(error, "Erro ao chamar a API Gemini.");
  }
}

async function generateWithOpenAiCompat(input: {
  baseUrl: string;
  apiToken: string;
  model: string;
  prompt: string;
}): Promise<string> {
  const url = `${input.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages: [{ role: "user", content: input.prompt }],
    }),
  });

  if (!response.ok) {
    await throwAiGenerateErrorFromResponse(response);
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new AiGenerateError("A API não retornou texto.");
  }
  return text;
}

async function generateWithAnthropic(input: {
  apiToken: string;
  model: string;
  prompt: string;
}): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": input.apiToken,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: 1024,
      messages: [{ role: "user", content: input.prompt }],
    }),
  });

  if (!response.ok) {
    await throwAiGenerateErrorFromResponse(response);
  }

  const json = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = json.content
    ?.map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  if (!text) {
    throw new AiGenerateError("A API Anthropic não retornou texto.");
  }
  return text;
}

export async function generateTextWithPlatformGemini(
  prompt: string,
): Promise<string> {
  const { apiKey, model } = readPlatformGeminiConfig();
  if (!apiKey) {
    throw new AiGenerateError("Gemini da plataforma não configurado.");
  }
  return generateWithGeminiApi(apiKey, model, prompt);
}

export async function generateTextWithUserProvider(
  credentials: UserAiProviderCredentials,
  prompt: string,
  requestedModel?: string | null,
): Promise<string> {
  const model = resolveModelForProvider(
    credentials.providerKey,
    credentials.defaultModel,
    requestedModel,
  );
  if (!model) {
    throw new AiGenerateError("Modelo de IA não configurado para este provedor.");
  }

  const { providerKey, apiToken } = credentials;

  if (providerKey === "google") {
    return generateWithGeminiApi(apiToken, model, prompt);
  }

  if (providerKey === "anthropic") {
    return generateWithAnthropic({ apiToken, model, prompt });
  }

  if (providerKey === "openai" || providerKey === "deepseek") {
    const baseUrl = OPENAI_COMPAT_BASE[providerKey];
    if (!baseUrl) {
      throw new AiGenerateError("Base da API não configurada.");
    }
    return generateWithOpenAiCompat({
      baseUrl,
      apiToken,
      model,
      prompt,
    });
  }

  if (providerKey === "custom") {
    if (!credentials.baseUrl?.trim()) {
      throw new AiGenerateError(
        "URL base do provedor personalizado não configurada.",
      );
    }
    return generateWithOpenAiCompat({
      baseUrl: credentials.baseUrl,
      apiToken,
      model,
      prompt,
    });
  }

  throw new AiGenerateError("Provedor de IA não suportado.");
}
