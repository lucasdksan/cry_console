import { describe, expect, it } from "vitest";

import {
  geminiEmbedRetryDelayMs,
  isGeminiEmbedRateLimitError,
} from "@/backend/lib/agent/help-center-gemini-embed";

describe("help-center-gemini-embed", () => {
  it("detecta erro 429", () => {
    expect(isGeminiEmbedRateLimitError({ status: 429 })).toBe(true);
    expect(isGeminiEmbedRateLimitError({ status: 404 })).toBe(false);
  });

  it("extrai retry delay da mensagem da API", () => {
    const ms = geminiEmbedRetryDelayMs({
      status: 429,
      message: "Quota exceeded. Please retry in 39.615626757s.",
    });
    expect(ms).toBeGreaterThanOrEqual(40_000);
  });
});
