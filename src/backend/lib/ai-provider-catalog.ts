export const AI_PROVIDER_KEYS = [
  "deepseek",
  "openai",
  "anthropic",
  "google",
  "custom",
] as const;

export type AiProviderKey = (typeof AI_PROVIDER_KEYS)[number];

export type AiProviderCatalogEntry = {
  label: string;
  description: string;
  modelSuggestions: readonly string[];
};

export const AI_PROVIDER_CATALOG: Record<AiProviderKey, AiProviderCatalogEntry> =
  {
    deepseek: {
      label: "DeepSeek",
      description: "API oficial DeepSeek (OpenAI-compatible).",
      modelSuggestions: ["deepseek-v4-flash", "deepseek-v4-pro"],
    },
    openai: {
      label: "OpenAI",
      description: "Chat Completions e modelos GPT.",
      modelSuggestions: ["gpt-4.1", "gpt-4.1-mini", "o4-mini"],
    },
    anthropic: {
      label: "Anthropic",
      description: "Claude via Messages API.",
      modelSuggestions: ["claude-sonnet-4-5", "claude-haiku-4-5"],
    },
    google: {
      label: "Google Gemini",
      description: "Gemini via Google AI Studio ou Vertex.",
      modelSuggestions: ["gemini-2.5-pro", "gemini-2.5-flash"],
    },
    custom: {
      label: "Outro provedor",
      description: "Gateway, self-hosted ou API compatível com OpenAI.",
      modelSuggestions: [],
    },
  };

export function isAiProviderKey(value: string): value is AiProviderKey {
  return (AI_PROVIDER_KEYS as readonly string[]).includes(value);
}

export function labelForAiProvider(key: AiProviderKey): string {
  return AI_PROVIDER_CATALOG[key].label;
}
