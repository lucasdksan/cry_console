"use server";

import { redirect } from "next/navigation";

import { auth } from "@/backend/auth";
import { isAiProviderKey } from "@/backend/lib/ai-provider-catalog";
import {
  validateAiModelInput,
  validateAiTokenInput,
} from "@/backend/lib/account-settings-policy";
import { CredentialsCryptoError } from "@/backend/lib/credentials-crypto";
import {
  clearUserAiProviderTokenForUser,
  deleteUserAiProviderForUser,
  listUserAiProvidersPublic,
  upsertUserAiProviderForUser,
  type UserAiProvidersPublic,
} from "@/backend/models/user-ai-provider.model";

export type AccountSettingsActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
  providers?: UserAiProvidersPublic;
};

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }
  return session.user.id;
}

function optionalTrimmed(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function readTokenUpdate(
  formData: FormData,
  configured: boolean,
):
  | { action: "set"; value: string }
  | { action: "keep" }
  | { action: "clear" } {
  const raw = optionalTrimmed(formData.get("apiToken"));
  if (raw) {
    const validated = validateAiTokenInput(raw);
    if (validated.error) {
      throw new AccountSettingsValidationError(validated.error, {
        apiToken: [validated.error],
      });
    }
    if (validated.value) {
      return { action: "set", value: validated.value };
    }
  }
  if (configured) {
    return { action: "keep" };
  }
  return { action: "keep" };
}

class AccountSettingsValidationError extends Error {
  fieldErrors: Record<string, string[]>;

  constructor(message: string, fieldErrors: Record<string, string[]>) {
    super(message);
    this.name = "AccountSettingsValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export async function fetchAccountAiProviders(): Promise<UserAiProvidersPublic> {
  const userId = await requireUserId();
  return listUserAiProvidersPublic(userId);
}

export async function saveUserAiProvider(
  _prevState: AccountSettingsActionState,
  formData: FormData,
): Promise<AccountSettingsActionState> {
  const userId = await requireUserId();
  const providerKeyRaw = optionalTrimmed(formData.get("providerKey"));
  if (!isAiProviderKey(providerKeyRaw)) {
    return { error: "Provedor inválido." };
  }

  const hasApiToken = formData.get("hasApiToken") === "1";
  const modelRaw = optionalTrimmed(formData.get("defaultModel"));
  const modelResult = validateAiModelInput(modelRaw);
  if (modelResult.error) {
    return {
      fieldErrors: { defaultModel: [modelResult.error] },
    };
  }

  let apiTokenUpdate: ReturnType<typeof readTokenUpdate>;
  try {
    apiTokenUpdate = readTokenUpdate(formData, hasApiToken);
  } catch (error) {
    if (error instanceof AccountSettingsValidationError) {
      return { fieldErrors: error.fieldErrors };
    }
    throw error;
  }

  try {
    const providers = await upsertUserAiProviderForUser(userId, {
      providerKey: providerKeyRaw,
      defaultModel: modelResult.value,
      apiToken: apiTokenUpdate,
    });
    return { success: "Provedor salvo.", providers };
  } catch (error) {
    if (error instanceof CredentialsCryptoError) {
      return {
        error:
          "Não foi possível cifrar o token. Verifique CREDENTIALS_ENCRYPTION_KEY.",
      };
    }
    return { error: "Não foi possível salvar o provedor." };
  }
}

export async function removeUserAiProvider(
  _prevState: AccountSettingsActionState,
  formData: FormData,
): Promise<AccountSettingsActionState> {
  const userId = await requireUserId();
  const providerKeyRaw = optionalTrimmed(formData.get("providerKey"));
  if (!isAiProviderKey(providerKeyRaw)) {
    return { error: "Provedor inválido." };
  }

  try {
    const providers = await deleteUserAiProviderForUser(
      userId,
      providerKeyRaw,
    );
    return { success: "Provedor removido.", providers };
  } catch {
    return { error: "Não foi possível remover o provedor." };
  }
}

export async function removeUserAiProviderToken(
  _prevState: AccountSettingsActionState,
  formData: FormData,
): Promise<AccountSettingsActionState> {
  const userId = await requireUserId();
  const providerKeyRaw = optionalTrimmed(formData.get("providerKey"));
  if (!isAiProviderKey(providerKeyRaw)) {
    return { error: "Provedor inválido." };
  }

  try {
    const providers = await clearUserAiProviderTokenForUser(
      userId,
      providerKeyRaw,
    );
    return { success: "Token removido.", providers };
  } catch {
    return { error: "Não foi possível remover o token." };
  }
}
