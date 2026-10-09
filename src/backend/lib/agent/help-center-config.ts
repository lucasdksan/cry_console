import { z } from "zod";

import { readPlatformGeminiConfig } from "@/backend/lib/ai/platform-config";

const DEFAULT_NAMESPACE = "vtex-help-pt";
/** Substitui `text-embedding-004`, removido da API Gemini (v1beta). */
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
const DEFAULT_EMBEDDING_DIMENSION = 768;

const DEPRECATED_EMBEDDING_MODELS = new Set([
  "text-embedding-004",
  "embedding-001",
  "models/text-embedding-004",
  "models/embedding-001",
]);

function resolveEmbeddingModel(raw: string | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return DEFAULT_EMBEDDING_MODEL;
  }
  if (DEPRECATED_EMBEDDING_MODELS.has(trimmed)) {
    return DEFAULT_EMBEDDING_MODEL;
  }
  return trimmed;
}

const helpCenterEnvSchema = z.object({
  PINECONE_API_KEY: z.string().trim().min(1).optional(),
  PINECONE_INDEX: z.string().trim().min(1).optional(),
  PINECONE_NAMESPACE: z.string().trim().min(1).optional(),
  GEMINI_EMBEDDING_MODEL: z.string().trim().min(1).optional(),
  GEMINI_EMBEDDING_DIMENSION: z.coerce.number().int().min(128).max(3072).optional(),
});

export function readHelpCenterPineconeConfig(): {
  apiKey: string | null;
  indexName: string | null;
  namespace: string;
  embeddingModel: string;
  embeddingDimension: number;
  geminiApiKey: string | null;
} {
  const parsed = helpCenterEnvSchema.safeParse(process.env);
  const gemini = readPlatformGeminiConfig();

  return {
    apiKey: parsed.success ? parsed.data.PINECONE_API_KEY ?? null : null,
    indexName: parsed.success ? parsed.data.PINECONE_INDEX ?? null : null,
    namespace: parsed.success
      ? parsed.data.PINECONE_NAMESPACE ?? DEFAULT_NAMESPACE
      : DEFAULT_NAMESPACE,
    embeddingModel: parsed.success
      ? resolveEmbeddingModel(parsed.data.GEMINI_EMBEDDING_MODEL)
      : DEFAULT_EMBEDDING_MODEL,
    embeddingDimension: parsed.success
      ? parsed.data.GEMINI_EMBEDDING_DIMENSION ?? DEFAULT_EMBEDDING_DIMENSION
      : DEFAULT_EMBEDDING_DIMENSION,
    geminiApiKey: gemini.apiKey,
  };
}

export function isHelpCenterPineconeConfigured(): boolean {
  const cfg = readHelpCenterPineconeConfig();
  return Boolean(cfg.apiKey && cfg.indexName && cfg.geminiApiKey);
}

/** Free tier Gemini: ~100 embedContent unidades/minuto (cada texto conta). */
export function readGeminiEmbedRateLimitConfig(): {
  batchSize: number;
  pauseMs: number;
  maxRetries: number;
} {
  const batchSize = Number(process.env.GEMINI_EMBED_BATCH_SIZE);
  const pauseMs = Number(process.env.GEMINI_EMBED_PAUSE_MS);
  const maxRetries = Number(process.env.GEMINI_EMBED_MAX_RETRIES);
  return {
    batchSize: Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 20,
    pauseMs: Number.isFinite(pauseMs) && pauseMs >= 0 ? pauseMs : 12_000,
    maxRetries: Number.isFinite(maxRetries) && maxRetries > 0 ? maxRetries : 8,
  };
}
