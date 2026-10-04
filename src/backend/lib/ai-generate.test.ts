import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AiGenerateError,
  generateTextWithUserProvider,
} from "@/backend/lib/ai-generate";

describe("generateTextWithUserProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("chama chat completions OpenAI-compatible", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: " resposta " } }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const text = await generateTextWithUserProvider(
      {
        providerKey: "openai",
        defaultModel: "gpt-4.1-mini",
        baseUrl: null,
        isDefault: true,
        apiToken: "sk-test",
      },
      "olá",
    );

    expect(text).toBe("resposta");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test",
        }),
      }),
    );
  });

  it("usa baseUrl no provedor custom", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "ok" } }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateTextWithUserProvider(
      {
        providerKey: "custom",
        defaultModel: "local-model",
        baseUrl: "https://gateway.test/v1",
        isDefault: true,
        apiToken: "tok",
      },
      "ping",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://gateway.test/v1/chat/completions",
      expect.any(Object),
    );
  });

  it("propaga erro HTTP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "rate limit" } }), {
          status: 429,
        }),
      ),
    );

    await expect(
      generateTextWithUserProvider(
        {
          providerKey: "deepseek",
          defaultModel: "deepseek-v4-flash",
          baseUrl: null,
          isDefault: false,
          apiToken: "key",
        },
        "teste",
      ),
    ).rejects.toBeInstanceOf(AiGenerateError);
  });
});
