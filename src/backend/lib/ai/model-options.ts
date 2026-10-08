import type { AgentModelChoice } from "@/backend/lib/agent/types";
import type { AgentModelSource } from "@/generated/prisma/client";

import {
  AI_PROVIDER_CATALOG,
  defaultPopularModelId,
  isAiProviderKey,
  labelForAiProvider,
  type AiProviderKey,
} from "@/backend/lib/ai/provider-catalog";
import type { AiRouteProviderInput } from "@/backend/lib/ai/route";

export type AgentModelOptionDto = {
  id: string;
  label: string;
  source: AgentModelSource;
  providerKey?: AiProviderKey;
  modelId?: string | null;
  groupLabel: string;
};

export function buildUserProviderModelOptions(
  providers: AiRouteProviderInput[],
): AgentModelOptionDto[] {
  const options: AgentModelOptionDto[] = [];

  for (const provider of providers) {
    if (!provider.hasApiToken || !isAiProviderKey(provider.providerKey)) {
      continue;
    }

    const groupLabel = labelForAiProvider(provider.providerKey);

    if (provider.providerKey === "custom") {
      const model = provider.defaultModel?.trim();
      if (!model) {
        continue;
      }
      options.push({
        id: "user:custom",
        label: model,
        groupLabel,
        source: "user_provider",
        providerKey: "custom",
        modelId: model,
      });
      continue;
    }

    for (const entry of AI_PROVIDER_CATALOG[provider.providerKey].popularModels) {
      options.push({
        id: `user:${provider.providerKey}:${entry.id}`,
        label: entry.label,
        groupLabel,
        source: "user_provider",
        providerKey: provider.providerKey,
        modelId: entry.id,
      });
    }
  }

  return options;
}

export function pickDefaultModelOptionId(
  options: AgentModelOptionDto[],
  providers: AiRouteProviderInput[],
): string {
  const defaultProvider =
    providers.find((p) => p.isDefault && p.hasApiToken) ??
    providers.find((p) => p.hasApiToken);

  if (
    defaultProvider &&
    isAiProviderKey(defaultProvider.providerKey) &&
    defaultProvider.providerKey !== "custom"
  ) {
    const modelId = defaultPopularModelId(defaultProvider.providerKey);
    if (modelId) {
      const id = `user:${defaultProvider.providerKey}:${modelId}`;
      if (options.some((o) => o.id === id)) {
        return id;
      }
    }
  }

  if (
    defaultProvider?.providerKey === "custom" &&
    defaultProvider.defaultModel?.trim()
  ) {
    if (options.some((o) => o.id === "user:custom")) {
      return "user:custom";
    }
  }

  return options[0]?.id ?? "";
}

export function reorderModelOptionsWithDefaultFirst(
  options: AgentModelOptionDto[],
  providers: AiRouteProviderInput[],
): AgentModelOptionDto[] {
  const defaultId = pickDefaultModelOptionId(options, providers);
  if (!defaultId) {
    return options;
  }
  const index = options.findIndex((o) => o.id === defaultId);
  if (index <= 0) {
    return options;
  }
  const next = [...options];
  const [item] = next.splice(index, 1);
  next.unshift(item);
  return next;
}

export function buildAgentModelOptions(input: {
  providers: AiRouteProviderInput[];
  platformGeminiConfigured: boolean;
  platformModel: string;
  chromeReady: boolean;
}): AgentModelOptionDto[] {
  const options = buildUserProviderModelOptions(input.providers);

  if (input.platformGeminiConfigured) {
    options.push({
      id: "platform",
      label: input.platformModel,
      groupLabel: "Plataforma",
      source: "platform",
      modelId: input.platformModel,
    });
  }

  if (input.chromeReady) {
    options.push({
      id: "browser",
      label: "Nativo do navegador",
      groupLabel: "Local",
      source: "browser",
    });
  }

  return reorderModelOptionsWithDefaultFirst(options, input.providers);
}

export function parseAgentModelOptionId(
  optionId: string,
  options: AgentModelOptionDto[],
): AgentModelChoice | null {
  if (optionId === "browser") {
    return { source: "browser" };
  }
  if (optionId === "platform") {
    return { source: "platform" };
  }

  const match = options.find((o) => o.id === optionId);
  if (!match || match.source !== "user_provider" || !match.providerKey) {
    return null;
  }

  return {
    source: "user_provider",
    providerKey: match.providerKey,
    model: match.modelId,
  };
}
