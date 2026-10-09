import { Pinecone } from "@pinecone-database/pinecone";

import {
  isHelpCenterPineconeConfigured,
  readHelpCenterPineconeConfig,
} from "@/backend/lib/agent/help-center-config";
import {
  embedHelpCenterQueryWithRateLimit,
  embedHelpCenterTextsWithRateLimit,
} from "@/backend/lib/agent/help-center-gemini-embed";
import type {
  HelpCenterChunk,
  HelpCenterPineconeMetadata,
} from "@/backend/lib/agent/help-center-types";

const PINECONE_FETCH_IDS_BATCH = 100;

export type HelpCenterUpsertSummary = {
  upserted: number;
  skipped: number;
};

let pineconeClient: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const { apiKey } = readHelpCenterPineconeConfig();
    if (!apiKey) {
      throw new Error("PINECONE_API_KEY não configurada.");
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

function getIndex() {
  const cfg = readHelpCenterPineconeConfig();
  if (!cfg.indexName) {
    throw new Error("PINECONE_INDEX não configurado.");
  }
  return getPineconeClient().index<HelpCenterPineconeMetadata>({
    name: cfg.indexName,
    namespace: cfg.namespace,
  });
}

export async function embedHelpCenterTexts(texts: string[]): Promise<number[][]> {
  return embedHelpCenterTextsWithRateLimit(texts, "RETRIEVAL_DOCUMENT");
}

export async function embedHelpCenterText(text: string): Promise<number[]> {
  const [vector] = await embedHelpCenterTexts([text]);
  return vector;
}

export function shouldForceHelpCenterReupsert(): boolean {
  return (
    process.env.VTEX_HELP_FORCE_UPSERT === "1" ||
    process.env.VTEX_HELP_FULL_REINDEX === "1"
  );
}

/** Mesmo id e metadados de conteúdo — não precisa re-embedar. */
export function helpCenterChunkMatchesIndexedMetadata(
  chunk: HelpCenterChunk,
  meta: HelpCenterPineconeMetadata,
): boolean {
  return (
    meta.url === chunk.url &&
    meta.title === chunk.title &&
    meta.content === chunk.content &&
    meta.source === chunk.source &&
    (meta.section ?? "") === (chunk.section ?? "")
  );
}

async function fetchHelpCenterMetadataByIds(
  ids: string[],
): Promise<Map<string, HelpCenterPineconeMetadata>> {
  if (ids.length === 0) {
    return new Map();
  }
  const index = getIndex();
  const byId = new Map<string, HelpCenterPineconeMetadata>();

  for (let i = 0; i < ids.length; i += PINECONE_FETCH_IDS_BATCH) {
    const batch = ids.slice(i, i + PINECONE_FETCH_IDS_BATCH);
    const response = await index.fetch({ ids: batch });
    for (const [id, record] of Object.entries(response.records ?? {})) {
      const meta = record.metadata as HelpCenterPineconeMetadata | undefined;
      if (meta?.content && meta.title && meta.url && meta.source) {
        byId.set(id, meta);
      }
    }
  }

  return byId;
}

export async function filterHelpCenterChunksNeedingUpsert(
  chunks: HelpCenterChunk[],
): Promise<{ toUpsert: HelpCenterChunk[]; skipped: number }> {
  if (chunks.length === 0 || shouldForceHelpCenterReupsert()) {
    return { toUpsert: chunks, skipped: 0 };
  }

  const existing = await fetchHelpCenterMetadataByIds(chunks.map((c) => c.id));
  const toUpsert: HelpCenterChunk[] = [];
  let skipped = 0;

  for (const chunk of chunks) {
    const meta = existing.get(chunk.id);
    if (meta && helpCenterChunkMatchesIndexedMetadata(chunk, meta)) {
      skipped += 1;
    } else {
      toUpsert.push(chunk);
    }
  }

  return { toUpsert, skipped };
}

/** Indica se já há ao menos um vetor indexado para a URL (namespace atual). */
export async function isHelpCenterUrlIndexed(url: string): Promise<boolean> {
  if (!isHelpCenterPineconeConfigured()) {
    return false;
  }
  const index = getIndex();
  const response = await index.fetchByMetadata({
    filter: { url: { $eq: url } },
    limit: 1,
  });
  return Object.keys(response.records ?? {}).length > 0;
}

export async function upsertHelpCenterChunks(
  chunks: HelpCenterChunk[],
): Promise<HelpCenterUpsertSummary> {
  if (chunks.length === 0) {
    return { upserted: 0, skipped: 0 };
  }

  const { toUpsert, skipped } = await filterHelpCenterChunksNeedingUpsert(chunks);
  if (toUpsert.length === 0) {
    return { upserted: 0, skipped };
  }

  const index = getIndex();
  const vectors = await embedHelpCenterTexts(
    toUpsert.map((c) => `${c.title}\n\n${c.content}`),
  );

  await index.upsert({
    records: toUpsert.map((chunk, i) => ({
      id: chunk.id,
      values: vectors[i]!,
      metadata: {
        url: chunk.url,
        title: chunk.title,
        section: chunk.section ?? "",
        content: chunk.content,
        source: chunk.source,
      },
    })),
  });

  return { upserted: toUpsert.length, skipped };
}

export async function searchHelpCenterChunks(
  query: string,
  limit = 4,
): Promise<HelpCenterChunk[]> {
  if (!isHelpCenterPineconeConfigured()) {
    return [];
  }
  const index = getIndex();
  const vector = await embedHelpCenterQueryWithRateLimit(query);
  const result = await index.query({
    vector,
    topK: limit,
    includeMetadata: true,
  });

  const chunks: HelpCenterChunk[] = [];
  for (const match of result.matches ?? []) {
    const meta = match.metadata;
    if (!meta?.content || !meta.title || !meta.url || !meta.source) {
      continue;
    }
    chunks.push({
      id: match.id,
      url: meta.url,
      title: meta.title,
      section: meta.section ? meta.section : undefined,
      content: meta.content,
      source: meta.source,
    });
  }
  return chunks;
}

/** Expõe cliente/index para testes com injeção futura. */
export function resetHelpCenterPineconeClientForTests(): void {
  pineconeClient = null;
}
