import { describe, expect, it } from "vitest";

import {
  validateAiBaseUrlInput,
  validateAiModelInput,
  validateAiTokenInput,
} from "@/backend/lib/account/settings-policy";

describe("account-settings-policy", () => {
  it("modelo vazio limpa o valor", () => {
    expect(validateAiModelInput("   ")).toEqual({ value: null });
  });

  it("rejeita modelo com quebra de linha", () => {
    expect(validateAiModelInput("gpt-4\n")).toMatchObject({
      error: expect.any(String),
    });
  });

  it("aceita token ASCII imprimível", () => {
    expect(validateAiTokenInput("sk-live-abc123")).toEqual({
      value: "sk-live-abc123",
    });
  });

  it("token vazio não altera", () => {
    expect(validateAiTokenInput("")).toEqual({});
  });

  it("rejeita linha de variável de ambiente", () => {
    expect(validateAiTokenInput("OPENAI_API_KEY=secret")).toMatchObject({
      error: expect.any(String),
    });
  });

  it("rejeita token entre aspas", () => {
    expect(validateAiTokenInput('"secret"')).toMatchObject({
      error: expect.any(String),
    });
  });

  it("normaliza URL base removendo barra final", () => {
    expect(validateAiBaseUrlInput("https://api.exemplo/v1/")).toEqual({
      value: "https://api.exemplo/v1",
    });
  });
});
