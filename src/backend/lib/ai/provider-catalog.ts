export const AI_PROVIDER_KEYS = [
  "deepseek",
  "openai",
  "anthropic",
  "google",
  "xai",
  "custom",
] as const;

export type AiProviderKey = (typeof AI_PROVIDER_KEYS)[number];

export type AiPopularModel = {
  id: string;
  label: string;
};

export type AiProviderCatalogEntry = {
  label: string;
  description: string;
  popularModels: readonly AiPopularModel[];
};

export const AI_PROVIDER_CATALOG: Record<AiProviderKey, AiProviderCatalogEntry> =
  {
    deepseek: {
      label: "DeepSeek",
      description: "API oficial DeepSeek (OpenAI-compatible).",
      popularModels: [
        { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
        { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
      ],
    },
    openai: {
      label: "OpenAI",
      description: "Chat Completions e modelos GPT.",
      popularModels: [
        { id: "gpt-4.1", label: "GPT-4.1" },
        { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
        { id: "gpt-4o", label: "GPT-4o" },
        { id: "gpt-4o-mini", label: "GPT-4o Mini" },
        { id: "o4-mini", label: "o4-mini" },
      ],
    },
    anthropic: {
      label: "Anthropic",
      description: "Claude via Messages API.",
      popularModels: [
        { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
        { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
        { id: "claude-opus-4-5", label: "Claude Opus 4.5" },
      ],
    },
    google: {
      label: "Google Gemini",
      description: "Gemini via Google AI Studio ou Vertex.",
      popularModels: [
        { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
        { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
        { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
        { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
        { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
      ],
    },
    xai: {
      label: "Grok (xAI)",
      description: "Grok via API xAI (OpenAI-compatible).",
      popularModels: [
        { id: "grok-4", label: "Grok 4" },
        { id: "grok-3", label: "Grok 3" },
        { id: "grok-3-mini", label: "Grok 3 Mini" },
      ],
    },
    custom: {
      label: "Outro provedor",
      description: "Gateway, self-hosted ou API compatível com OpenAI.",
      popularModels: [],
    },
  };

/** Provedores com catálogo fixo; modelo é escolhido no chat, não nas configurações. */
export const KNOWN_AI_PROVIDER_KEYS = AI_PROVIDER_KEYS.filter(
  (key): key is Exclude<AiProviderKey, "custom"> => key !== "custom",
);

export function isKnownAiProviderKey(
  key: AiProviderKey,
): key is Exclude<AiProviderKey, "custom"> {
  return key !== "custom";
}

export function isAiProviderKey(value: string): value is AiProviderKey {
  return (AI_PROVIDER_KEYS as readonly string[]).includes(value);
}

export function labelForAiProvider(key: AiProviderKey): string {
  return AI_PROVIDER_CATALOG[key].label;
}

export function isPopularModelForProvider(
  providerKey: AiProviderKey,
  modelId: string,
): boolean {
  if (providerKey === "custom") {
    return false;
  }
  const trimmed = modelId.trim();
  return AI_PROVIDER_CATALOG[providerKey].popularModels.some(
    (m) => m.id === trimmed,
  );
}

export function labelForPopularModel(
  providerKey: Exclude<AiProviderKey, "custom">,
  modelId: string,
): string | null {
  const match = AI_PROVIDER_CATALOG[providerKey].popularModels.find(
    (m) => m.id === modelId.trim(),
  );
  return match?.label ?? null;
}

export function defaultPopularModelId(
  providerKey: AiProviderKey,
): string | null {
  if (providerKey === "custom") {
    return null;
  }
  return AI_PROVIDER_CATALOG[providerKey].popularModels[0]?.id ?? null;
}
