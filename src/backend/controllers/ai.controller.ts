"use server";

import { redirect } from "next/navigation";

import { auth } from "@/backend/auth";
import {
  AiGenerateError,
  generateTextWithPlatformGemini,
  generateTextWithUserProvider,
} from "@/backend/lib/ai-generate";
import { isPlatformGeminiConfigured } from "@/backend/lib/ai-platform-config";
import {
  resolveAiRoute,
  validateUserProviderConfig,
  type AiRouteProviderInput,
} from "@/backend/lib/ai-route";
import type { AiProviderKey } from "@/backend/lib/ai-provider-catalog";
import { CredentialsCryptoError } from "@/backend/lib/credentials-crypto";
import {
  listUserAiProvidersForRouting,
  loadUserAiProviderCredentials,
} from "@/backend/models/user-ai-provider.model";

export type AiGenerationRoutePublic =
  | { route: "user" }
  | { route: "browser" }
  | { route: "platform" }
  | { route: "error"; message: string };

export type AiTextResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }
  return session.user.id;
}

function toRouteInput(
  providers: Awaited<ReturnType<typeof listUserAiProvidersForRouting>>,
): AiRouteProviderInput[] {
  return providers.map((p) => ({
    providerKey: p.providerKey,
    defaultModel: p.defaultModel,
    baseUrl: p.baseUrl,
    hasApiToken: p.hasApiToken,
    isDefault: p.isDefault,
  }));
}

export async function resolveAiGenerationRoute(input: {
  chromeReady: boolean;
}): Promise<AiGenerationRoutePublic> {
  const userId = await requireUserId();
  const providers = await listUserAiProvidersForRouting(userId);
  const route = resolveAiRoute({
    executionContext: "client",
    chromeReady: input.chromeReady,
    providers: toRouteInput(providers),
    platformGeminiConfigured: isPlatformGeminiConfigured(),
  });

  if (route.kind === "error") {
    return { route: "error", message: route.message };
  }
  if (route.kind === "user") {
    return { route: "user" };
  }
  if (route.kind === "browser") {
    return { route: "browser" };
  }
  return { route: "platform" };
}

export async function generateAiText(
  prompt: string,
  options?: { model?: string | null },
): Promise<AiTextResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { ok: false, error: "Informe um prompt." };
  }

  const userId = await requireUserId();
  const providers = await listUserAiProvidersForRouting(userId);
  const route = resolveAiRoute({
    executionContext: "server",
    chromeReady: false,
    providers: toRouteInput(providers),
    platformGeminiConfigured: isPlatformGeminiConfigured(),
  });

  if (route.kind === "error") {
    return { ok: false, error: route.message };
  }

  try {
    if (route.kind === "user") {
      const credentials = await loadUserAiProviderCredentials(
        userId,
        route.providerKey,
      );
      if (!credentials) {
        return {
          ok: false,
          error: "Não foi possível carregar as credenciais do provedor.",
        };
      }
      const configError = validateUserProviderConfig(
        route.providerKey,
        credentials.defaultModel,
        credentials.baseUrl,
        options?.model,
      );
      if (configError) {
        return { ok: false, error: configError.message };
      }
      const text = await generateTextWithUserProvider(
        credentials,
        trimmed,
        options?.model,
      );
      return { ok: true, text };
    }

    const text = await generateTextWithPlatformGemini(trimmed);
    return { ok: true, text };
  } catch (error) {
    if (error instanceof AiGenerateError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof CredentialsCryptoError) {
      return {
        ok: false,
        error:
          "Não foi possível decifrar o token do provedor. Verifique CREDENTIALS_ENCRYPTION_KEY.",
      };
    }
    return { ok: false, error: "Não foi possível gerar texto com a IA." };
  }
}

export async function generateAiTextOnServer(
  userId: string,
  prompt: string,
  options?: { model?: string | null },
): Promise<AiTextResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { ok: false, error: "Informe um prompt." };
  }

  const providers = await listUserAiProvidersForRouting(userId);
  const route = resolveAiRoute({
    executionContext: "server",
    chromeReady: false,
    providers: toRouteInput(providers),
    platformGeminiConfigured: isPlatformGeminiConfigured(),
  });

  if (route.kind === "error") {
    return { ok: false, error: route.message };
  }

  try {
    if (route.kind === "user") {
      const credentials = await loadUserAiProviderCredentials(
        userId,
        route.providerKey as AiProviderKey,
      );
      if (!credentials) {
        return {
          ok: false,
          error: "Não foi possível carregar as credenciais do provedor.",
        };
      }
      const configError = validateUserProviderConfig(
        route.providerKey,
        credentials.defaultModel,
        credentials.baseUrl,
        options?.model,
      );
      if (configError) {
        return { ok: false, error: configError.message };
      }
      const text = await generateTextWithUserProvider(
        credentials,
        trimmed,
        options?.model,
      );
      return { ok: true, text };
    }

    const text = await generateTextWithPlatformGemini(trimmed);
    return { ok: true, text };
  } catch (error) {
    if (error instanceof AiGenerateError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof CredentialsCryptoError) {
      return {
        ok: false,
        error:
          "Não foi possível decifrar o token do provedor. Verifique CREDENTIALS_ENCRYPTION_KEY.",
      };
    }
    return { ok: false, error: "Não foi possível gerar texto com a IA." };
  }
}
