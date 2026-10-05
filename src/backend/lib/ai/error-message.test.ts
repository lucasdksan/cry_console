import { describe, expect, it } from "vitest";

import { humanizeAiErrorInput } from "@/backend/lib/ai/error-message";
import { AiGenerateError } from "@/backend/lib/ai/generate";

describe("humanizeAiErrorInput", () => {
  it("traduz 503 UNAVAILABLE do Gemini", () => {
    const raw = JSON.stringify({
      error: {
        code: 503,
        message:
          "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
        status: "UNAVAILABLE",
      },
    });
    const result = humanizeAiErrorInput({ raw, httpStatus: 503 });
    expect(result.retryable).toBe(true);
    expect(result.message).toMatch(/alta demanda/i);
    expect(result.message).not.toContain("high demand");
  });

  it("AiGenerateError.fromRaw humaniza JSON", () => {
    const err = AiGenerateError.fromRaw(
      '{"error":{"code":503,"status":"UNAVAILABLE","message":"high demand"}}',
      503,
    );
    expect(err.retryable).toBe(true);
    expect(err.message).toMatch(/503/);
  });
});
