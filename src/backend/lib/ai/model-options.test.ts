import { describe, expect, it } from "vitest";

import {
  buildAgentModelOptions,
  buildUserProviderModelOptions,
  parseAgentModelOptionId,
} from "@/backend/lib/ai/model-options";
import type { AiRouteProviderInput } from "@/backend/lib/ai/route";
import { validateUserProviderConfig } from "@/backend/lib/ai/route";

function provider(
  partial: Partial<AiRouteProviderInput> & Pick<AiRouteProviderInput, "providerKey">,
): AiRouteProviderInput {
  return {
    defaultModel: null,
    baseUrl: null,
    hasApiToken: true,
    isDefault: false,
    ...partial,
  };
}

describe("buildUserProviderModelOptions", () => {
  it("emite um item por modelo popular de cada provedor com token", () => {
    const options = buildUserProviderModelOptions([
      provider({ providerKey: "openai" }),
      provider({ providerKey: "deepseek" }),
    ]);

    expect(options.some((o) => o.id === "user:openai:gpt-4.1")).toBe(true);
    expect(options.some((o) => o.id === "user:deepseek:deepseek-v4-flash")).toBe(
      true,
    );
    expect(options.length).toBeGreaterThan(5);
  });

  it("inclui custom apenas quando modelo está configurado", () => {
    const missing = buildUserProviderModelOptions([
      provider({ providerKey: "custom", defaultModel: null, baseUrl: "https://x/v1" }),
    ]);
    expect(missing).toHaveLength(0);

    const configured = buildUserProviderModelOptions([
      provider({
        providerKey: "custom",
        defaultModel: "local-model",
        baseUrl: "https://x/v1",
      }),
    ]);
    expect(configured).toEqual([
      expect.objectContaining({
        id: "user:custom",
        modelId: "local-model",
        groupLabel: "Outro provedor",
      }),
    ]);
  });
});

describe("buildAgentModelOptions", () => {
  it("coloca o primeiro modelo do provedor padrão no início", () => {
    const providers = [
      provider({ providerKey: "deepseek" }),
      provider({ providerKey: "openai", isDefault: true }),
    ];
    const options = buildAgentModelOptions({
      providers,
      platformGeminiConfigured: false,
      platformModel: "gemini-test",
      chromeReady: false,
    });

    expect(options[0]?.id).toBe("user:openai:gpt-4.1");
  });
});

describe("parseAgentModelOptionId", () => {
  it("resolve modelo a partir da opção selecionada", () => {
    const options = buildUserProviderModelOptions([
      provider({ providerKey: "openai" }),
    ]);
    const choice = parseAgentModelOptionId("user:openai:gpt-4o-mini", options);
    expect(choice).toEqual({
      source: "user_provider",
      providerKey: "openai",
      model: "gpt-4o-mini",
    });
  });

  it("rejeita id fora da lista de opções", () => {
    const options = buildUserProviderModelOptions([
      provider({ providerKey: "openai" }),
    ]);
    expect(
      parseAgentModelOptionId("user:openai:modelo-inexistente", options),
    ).toBeNull();
  });
});

describe("validateUserProviderConfig", () => {
  it("rejeita modelo fora do catálogo para provedor conhecido", () => {
    const error = validateUserProviderConfig(
      "openai",
      null,
      null,
      "gpt-inventado",
    );
    expect(error).toMatchObject({ message: "Modelo inválido para este provedor." });
  });
});
