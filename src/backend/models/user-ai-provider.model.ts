import {
  CredentialsCryptoError,
  encryptUserAiProviderSecret,
} from "@/backend/lib/credentials-crypto";
import {
  AI_PROVIDER_CATALOG,
  AI_PROVIDER_KEYS,
  type AiProviderKey,
  isAiProviderKey,
  labelForAiProvider,
} from "@/backend/lib/ai-provider-catalog";
import { prisma } from "@/backend/models/prisma";

export type UserAiProviderPublic = {
  providerKey: AiProviderKey;
  label: string;
  defaultModel: string | null;
  hasApiToken: boolean;
};

export type UserAiProvidersPublic = {
  providers: UserAiProviderPublic[];
  availableToAdd: { providerKey: AiProviderKey; label: string }[];
};

function toProviderPublic(row: {
  providerKey: string;
  defaultModel: string | null;
  apiTokenEnc: string | null;
}): UserAiProviderPublic | null {
  if (!isAiProviderKey(row.providerKey)) {
    return null;
  }
  return {
    providerKey: row.providerKey,
    label: labelForAiProvider(row.providerKey),
    defaultModel: row.defaultModel,
    hasApiToken: Boolean(row.apiTokenEnc),
  };
}

export async function listUserAiProvidersPublic(
  userId: string,
): Promise<UserAiProvidersPublic> {
  const rows = await prisma.userAiProvider.findMany({
    where: { userId },
    orderBy: { providerKey: "asc" },
    select: {
      providerKey: true,
      defaultModel: true,
      apiTokenEnc: true,
    },
  });

  const configuredKeys = new Set<string>();
  const providers: UserAiProviderPublic[] = [];

  for (const row of rows) {
    const pub = toProviderPublic(row);
    if (pub) {
      providers.push(pub);
      configuredKeys.add(pub.providerKey);
    }
  }

  providers.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  const availableToAdd = AI_PROVIDER_KEYS.filter(
    (key) => !configuredKeys.has(key),
  ).map((providerKey) => ({
    providerKey,
    label: AI_PROVIDER_CATALOG[providerKey].label,
  }));

  return { providers, availableToAdd };
}

type ApiTokenUpdate =
  | { action: "set"; value: string }
  | { action: "keep" }
  | { action: "clear" };

export async function upsertUserAiProviderForUser(
  userId: string,
  input: {
    providerKey: AiProviderKey;
    defaultModel: string | null;
    apiToken: ApiTokenUpdate;
  },
): Promise<UserAiProvidersPublic> {
  const existing = await prisma.userAiProvider.findUnique({
    where: {
      userId_providerKey: { userId, providerKey: input.providerKey },
    },
    select: { apiTokenEnc: true },
  });

  let apiTokenEnc: string | null | undefined = undefined;

  if (input.apiToken.action === "clear") {
    apiTokenEnc = null;
  } else if (input.apiToken.action === "set") {
    try {
      apiTokenEnc = encryptUserAiProviderSecret(
        input.apiToken.value,
        userId,
        input.providerKey,
      );
    } catch (error) {
      if (error instanceof CredentialsCryptoError) {
        throw error;
      }
      throw error;
    }
  } else if (existing?.apiTokenEnc) {
    apiTokenEnc = existing.apiTokenEnc;
  }

  const data = {
    defaultModel: input.defaultModel,
    ...(apiTokenEnc !== undefined ? { apiTokenEnc } : {}),
  };

  if (existing) {
    await prisma.userAiProvider.update({
      where: {
        userId_providerKey: { userId, providerKey: input.providerKey },
      },
      data,
    });
  } else {
    await prisma.userAiProvider.create({
      data: {
        userId,
        providerKey: input.providerKey,
        ...data,
        apiTokenEnc: apiTokenEnc ?? null,
      },
    });
  }

  return listUserAiProvidersPublic(userId);
}

export async function deleteUserAiProviderForUser(
  userId: string,
  providerKey: AiProviderKey,
): Promise<UserAiProvidersPublic> {
  await prisma.userAiProvider.deleteMany({
    where: { userId, providerKey },
  });
  return listUserAiProvidersPublic(userId);
}

export async function clearUserAiProviderTokenForUser(
  userId: string,
  providerKey: AiProviderKey,
): Promise<UserAiProvidersPublic> {
  await prisma.userAiProvider.updateMany({
    where: { userId, providerKey },
    data: { apiTokenEnc: null },
  });
  return listUserAiProvidersPublic(userId);
}
