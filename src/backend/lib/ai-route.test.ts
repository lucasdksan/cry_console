import { describe, expect, it } from "vitest";

import type { AiRouteProviderInput } from "@/backend/lib/ai-route";
import {
  resolveAiRoute,
  resolveUserAiProvider,
} from "@/backend/lib/ai-route";

function provider(
  partial: Partial<AiRouteProviderInput> & Pick<AiRouteProviderInput, "providerKey">,
): AiRouteProviderInput {
  return {
    defaultModel: null,
    baseUrl: null,
    hasApiToken: false,
    isDefault: false,
    ...partial,
  };
}

describe("resolveUserAiProvider", () => {
  it("usa o único provedor com token sem marca de padrão", () => {
    expect(
      resolveUserAiProvider([
        provider({ providerKey: "openai", hasApiToken: true }),
      ]),
    ).toEqual({ kind: "user", providerKey: "openai" });
  });

  it("exige padrão quando há vários com token", () => {
    expect(
      resolveUserAiProvider([
        provider({ providerKey: "openai", hasApiToken: true }),
        provider({ providerKey: "google", hasApiToken: true }),
      ]),
    ).toMatchObject({ kind: "error", code: "ambiguous_providers" });
  });

  it("rejeita padrão marcado sem token", () => {
    expect(
      resolveUserAiProvider([
        provider({ providerKey: "openai", isDefault: true }),
      ]),
    ).toMatchObject({ kind: "error", code: "default_without_token" });
  });
});

describe("resolveAiRoute", () => {
  it("prioriza provedor do usuário", () => {
    expect(
      resolveAiRoute({
        executionContext: "client",
        chromeReady: true,
        platformGeminiConfigured: true,
        providers: [provider({ providerKey: "google", hasApiToken: true })],
      }),
    ).toEqual({ kind: "user", providerKey: "google" });
  });

  it("usa Chrome no client quando não há provedor do usuário", () => {
    expect(
      resolveAiRoute({
        executionContext: "client",
        chromeReady: true,
        platformGeminiConfigured: true,
        providers: [],
      }),
    ).toEqual({ kind: "browser" });
  });

  it("no servidor cai no Gemini da plataforma", () => {
    expect(
      resolveAiRoute({
        executionContext: "server",
        chromeReady: false,
        platformGeminiConfigured: true,
        providers: [],
      }),
    ).toEqual({ kind: "platform-gemini" });
  });
});
