import { GoogleGenAI } from "@google/genai";

import {
  readGeminiEmbedRateLimitConfig,
  readHelpCenterPineconeConfig,
} from "@/backend/lib/agent/help-center-config";

type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isGeminiEmbedRateLimitError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: number }).status === 429
  );
}

export function geminiEmbedRetryDelayMs(
  error: unknown,
  fallbackMs = 45_000,
): number {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: string }).message ?? "");
    const match = message.match(/retry in (\d+(?:\.\d+)?)s/i);
    if (match) {
      return Math.ceil(parseFloat(match[1]!) * 1000) + 500;
    }
  }
  return fallbackMs;
}

async function embedBatch(input: {
  texts: string[];
  taskType: EmbedTaskType;
}): Promise<number[][]> {
  const cfg = readHelpCenterPineconeConfig();
  if (!cfg.geminiApiKey) {
    throw new Error("GEMINI_API_KEY não configurada para embeddings.");
  }
  if (input.texts.length === 0) {
    return [];
  }

  const ai = new GoogleGenAI({ apiKey: cfg.geminiApiKey });
  const response = await ai.models.embedContent({
    model: cfg.embeddingModel,
    contents: input.texts,
    config: {
      outputDimensionality: cfg.embeddingDimension,
      taskType: input.taskType,
    },
  });

  const embeddings = response.embeddings ?? [];
  const vectors = embeddings.map((row) => row.values ?? []);
  if (vectors.length !== input.texts.length) {
    throw new Error("Resposta de embedding incompleta do Gemini.");
  }
  for (const values of vectors) {
    if (values.length === 0) {
      throw new Error("Embedding vazio retornado pelo Gemini.");
    }
  }
  return vectors;
}

async function embedBatchWithRetry(input: {
  texts: string[];
  taskType: EmbedTaskType;
}): Promise<number[][]> {
  const { maxRetries } = readGeminiEmbedRateLimitConfig();
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      return await embedBatch(input);
    } catch (error) {
      lastError = error;
      if (!isGeminiEmbedRateLimitError(error) || attempt >= maxRetries - 1) {
        throw error;
      }
      const waitMs = geminiEmbedRetryDelayMs(error);
      await sleep(waitMs);
    }
  }
  throw lastError;
}

export async function embedHelpCenterTextsWithRateLimit(
  texts: string[],
  taskType: EmbedTaskType = "RETRIEVAL_DOCUMENT",
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const { batchSize, pauseMs } = readGeminiEmbedRateLimitConfig();
  const vectors: number[][] = [];

  for (let start = 0; start < texts.length; start += batchSize) {
    const slice = texts.slice(start, start + batchSize);
    const batchVectors = await embedBatchWithRetry({ texts: slice, taskType });
    vectors.push(...batchVectors);
    const hasMore = start + batchSize < texts.length;
    if (hasMore && pauseMs > 0) {
      await sleep(pauseMs);
    }
  }

  return vectors;
}

export async function embedHelpCenterQueryWithRateLimit(
  query: string,
): Promise<number[]> {
  const [vector] = await embedHelpCenterTextsWithRateLimit(
    [query],
    "RETRIEVAL_QUERY",
  );
  return vector!;
}
