import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/backend/lib/agent/help-center-config", () => ({
  isHelpCenterPineconeConfigured: vi.fn(() => true),
  readHelpCenterPineconeConfig: vi.fn(() => ({
    apiKey: "test-key",
    indexName: "test-index",
    namespace: "vtex-help-pt",
    embeddingModel: "gemini-embedding-001",
    embeddingDimension: 768,
    geminiApiKey: "gemini-key",
  })),
  readGeminiEmbedRateLimitConfig: vi.fn(() => ({
    batchSize: 20,
    pauseMs: 0,
    maxRetries: 3,
  })),
}));

const embedContent = vi.fn();
const query = vi.fn();
const upsert = vi.fn();
const fetch = vi.fn();
const fetchByMetadata = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(() => ({
    models: { embedContent },
  })),
}));

vi.mock("@pinecone-database/pinecone", () => ({
  Pinecone: vi.fn(() => ({
    index: vi.fn(() => ({
      upsert,
      query,
      fetch,
      fetchByMetadata,
    })),
  })),
}));

describe("help-center-pinecone", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("searchHelpCenterChunks mapeia metadata para chunks", async () => {
    embedContent.mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2, 0.3] }],
    });
    query.mockResolvedValue({
      matches: [
        {
          id: "abc",
          metadata: {
            url: "https://help.vtex.com/pt/docs/tutorials/foo",
            title: "Foo",
            section: "Suporte",
            content: "Texto do artigo",
            source: "tutorials",
          },
        },
      ],
    });

    const { searchHelpCenterChunks, resetHelpCenterPineconeClientForTests } =
      await import("@/backend/lib/agent/help-center-pinecone");
    resetHelpCenterPineconeClientForTests();

    const chunks = await searchHelpCenterChunks("suporte vtex", 2);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.title).toBe("Foo");
    expect(chunks[0]?.content).toContain("Texto do artigo");
  });

  it("upsertHelpCenterChunks envia records com embedding", async () => {
    fetch.mockResolvedValue({ records: {} });
    embedContent.mockResolvedValue({
      embeddings: [{ values: [0.5, 0.6] }],
    });
    upsert.mockResolvedValue(undefined);

    const { upsertHelpCenterChunks, resetHelpCenterPineconeClientForTests } =
      await import("@/backend/lib/agent/help-center-pinecone");
    resetHelpCenterPineconeClientForTests();

    const summary = await upsertHelpCenterChunks([
      {
        id: "chunk-1",
        url: "https://help.vtex.com/pt/docs/tutorials/foo",
        title: "Foo",
        content: "Corpo",
        source: "tutorials",
      },
    ]);

    expect(summary).toEqual({ upserted: 1, skipped: 0 });
    expect(upsert).toHaveBeenCalledOnce();
    expect(embedContent).toHaveBeenCalled();
  });

  it("upsertHelpCenterChunks pula chunks já indexados com o mesmo conteúdo", async () => {
    fetch.mockResolvedValue({
      records: {
        "chunk-1": {
          metadata: {
            url: "https://help.vtex.com/pt/docs/tutorials/foo",
            title: "Foo",
            content: "Corpo",
            source: "tutorials",
            section: "",
          },
        },
      },
    });

    const { upsertHelpCenterChunks, resetHelpCenterPineconeClientForTests } =
      await import("@/backend/lib/agent/help-center-pinecone");
    resetHelpCenterPineconeClientForTests();

    const summary = await upsertHelpCenterChunks([
      {
        id: "chunk-1",
        url: "https://help.vtex.com/pt/docs/tutorials/foo",
        title: "Foo",
        content: "Corpo",
        source: "tutorials",
      },
    ]);

    expect(summary).toEqual({ upserted: 0, skipped: 1 });
    expect(upsert).not.toHaveBeenCalled();
    expect(embedContent).not.toHaveBeenCalled();
  });

  it("isHelpCenterUrlIndexed consulta fetchByMetadata", async () => {
    fetchByMetadata.mockResolvedValue({
      records: { abc: { metadata: { url: "https://help.vtex.com/foo" } } },
    });

    const { isHelpCenterUrlIndexed, resetHelpCenterPineconeClientForTests } =
      await import("@/backend/lib/agent/help-center-pinecone");
    resetHelpCenterPineconeClientForTests();

    await expect(
      isHelpCenterUrlIndexed("https://help.vtex.com/foo"),
    ).resolves.toBe(true);
    expect(fetchByMetadata).toHaveBeenCalledWith({
      filter: { url: { $eq: "https://help.vtex.com/foo" } },
      limit: 1,
    });
  });
});
