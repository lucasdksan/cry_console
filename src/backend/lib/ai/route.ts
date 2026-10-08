import {
  AI_PROVIDER_CATALOG,
  isKnownAiProviderKey,
  isPopularModelForProvider,
  type AiProviderKey,
} from "@/backend/lib/ai/provider-catalog";

export type AiRouteProviderInput = {
  providerKey: AiProviderKey;
  defaultModel: string | null;
  baseUrl: string | null;
  hasApiToken: boolean;
  isDefault: boolean;
};

export type AiRouteSuccess =
  | { kind: "user"; providerKey: AiProviderKey }
  | { kind: "browser" }
  | { kind: "platform-gemini" };

export type AiRouteFailure = {
  kind: "error";
  code:
    | "ambiguous_providers"
    | "default_without_token"
    | "custom_missing_config"
    | "platform_unconfigured";
  message: string;
};

export type AiRouteResult = AiRouteSuccess | AiRouteFailure;

export function resolveModelForProvider(
  providerKey: AiProviderKey,
  defaultModel: string | null,
  requestedModel?: string | null,
): string | null {
  const explicit = requestedModel?.trim();
  if (explicit) {
    return explicit;
  }
  if (defaultModel?.trim()) {
    return defaultModel.trim();
  }
  const first = AI_PROVIDER_CATALOG[providerKey].popularModels[0];
  return first?.id ?? null;
}

export function resolveUserAiProvider(
  providers: AiRouteProviderInput[],
): AiRouteResult | { kind: "none" } {
  const withToken = providers.filter((p) => p.hasApiToken);
  const markedDefault = providers.filter((p) => p.isDefault);

  if (markedDefault.some((p) => !p.hasApiToken)) {
    return {
      kind: "error",
      code: "default_without_token",
      message:
        "O provedor marcado como padrão não tem token. Configure o token ou escolha outro padrão.",
    };
  }

  if (withToken.length === 0) {
    return { kind: "none" };
  }

  if (withToken.length === 1) {
    return { kind: "user", providerKey: withToken[0]!.providerKey };
  }

  const defaultWithToken = withToken.filter((p) => p.isDefault);
  if (defaultWithToken.length === 1) {
    return {
      kind: "user",
      providerKey: defaultWithToken[0]!.providerKey,
    };
  }

  return {
    kind: "error",
    code: "ambiguous_providers",
    message:
      "Vários provedores têm token. Marque um como padrão nas configurações da conta.",
  };
}

export function validateUserProviderConfig(
  providerKey: AiProviderKey,
  defaultModel: string | null,
  baseUrl: string | null,
  requestedModel?: string | null,
): AiRouteFailure | null {
  const model = resolveModelForProvider(
    providerKey,
    defaultModel,
    requestedModel,
  );
  if (providerKey === "custom") {
    if (!baseUrl?.trim()) {
      return {
        kind: "error",
        code: "custom_missing_config",
        message:
          "Configure a URL base do provedor personalizado nas configurações da conta.",
      };
    }
    if (!model) {
      return {
        kind: "error",
        code: "custom_missing_config",
        message:
          "Configure o modelo padrão do provedor personalizado nas configurações da conta.",
      };
    }
  }
  if (!model && providerKey !== "custom") {
    return {
      kind: "error",
      code: "custom_missing_config",
      message: "Configure um modelo para o provedor de IA.",
    };
  }

  const explicit = requestedModel?.trim();
  if (explicit && isKnownAiProviderKey(providerKey)) {
    if (!isPopularModelForProvider(providerKey, explicit)) {
      return {
        kind: "error",
        code: "custom_missing_config",
        message: "Modelo inválido para este provedor.",
      };
    }
  }

  if (providerKey === "custom" && explicit && defaultModel?.trim()) {
    if (explicit !== defaultModel.trim()) {
      return {
        kind: "error",
        code: "custom_missing_config",
        message: "Modelo inválido para o provedor personalizado.",
      };
    }
  }

  return null;
}

export function resolveAiRoute(input: {
  executionContext: "server" | "client";
  chromeReady: boolean;
  providers: AiRouteProviderInput[];
  platformGeminiConfigured: boolean;
}): AiRouteResult {
  const userResolution = resolveUserAiProvider(input.providers);
  if (userResolution.kind === "error") {
    return userResolution;
  }
  if (userResolution.kind === "user") {
    return userResolution;
  }

  if (input.executionContext === "client" && input.chromeReady) {
    return { kind: "browser" };
  }

  if (input.platformGeminiConfigured) {
    return { kind: "platform-gemini" };
  }

  return {
    kind: "error",
    code: "platform_unconfigured",
    message:
      "Nenhum provedor do usuário disponível e o Gemini da plataforma não está configurado.",
  };
}
