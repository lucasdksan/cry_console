"use client";

import {
  generateAiText,
  resolveAiGenerationRoute,
} from "@/backend/controllers/ai.controller";

type ChromePromptAvailability =
  | "available"
  | "readily"
  | "downloadable"
  | "downloading"
  | "unavailable";

interface ChromePromptSession {
  destroy?: () => void;
  prompt?: (input: string) => Promise<string>;
}

interface ChromeLanguageModelApi {
  availability?: () => Promise<ChromePromptAvailability>;
  create?: () => Promise<ChromePromptSession>;
}

function getLanguageModelApi(): ChromeLanguageModelApi | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  const globalWindow = window as Window & {
    LanguageModel?: ChromeLanguageModelApi;
    ai?: { languageModel?: ChromeLanguageModelApi };
  };
  return globalWindow.LanguageModel ?? globalWindow.ai?.languageModel;
}

function isChromePromptReadyStatus(
  availability: ChromePromptAvailability | undefined,
): boolean {
  return availability === "available" || availability === "readily";
}

export async function checkChromePromptReady(): Promise<boolean> {
  const languageModel = getLanguageModelApi();
  if (!languageModel?.availability) {
    return false;
  }
  try {
    const availability = await languageModel.availability();
    return isChromePromptReadyStatus(availability);
  } catch {
    return false;
  }
}

export async function generateChromePromptText(prompt: string): Promise<string> {
  const languageModel = getLanguageModelApi();
  if (!languageModel?.create) {
    throw new Error("Chrome Prompt API indisponível neste navegador.");
  }

  const session = await languageModel.create();
  try {
    if (!session.prompt) {
      throw new Error("Sessão da Prompt API não suporta geração de texto.");
    }
    const text = (await session.prompt(prompt)).trim();
    if (!text) {
      throw new Error("O modelo local não retornou texto.");
    }
    return text;
  } finally {
    session.destroy?.();
  }
}

export async function generateTextClient(
  prompt: string,
  options?: { model?: string | null },
): Promise<string> {
  const chromeReady = await checkChromePromptReady();
  const route = await resolveAiGenerationRoute({ chromeReady });

  if (route.route === "error") {
    throw new Error(route.message);
  }

  if (route.route === "browser") {
    return generateChromePromptText(prompt);
  }

  const result = await generateAiText(prompt, {
    model: options?.model,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.text;
}
