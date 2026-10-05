import {
  CredentialsCryptoError,
  decryptUserAiProviderSecret,
  encryptUserAiProviderSecret,
} from "@/backend/lib/account/credentials-crypto";
import {
  AI_PROVIDER_CATALOG,
  AI_PROVIDER_KEYS,
  type AiProviderKey,
  isAiProviderKey,
  labelForAiProvider,
} from "@/backend/lib/ai/provider-catalog";
import { prisma } from "@/backend/models/prisma";

export type UserAiProviderPublic = {
  providerKey: AiProviderKey;
  label: string;
  defaultModel: string | null;
  baseUrl: string | null;
  isDefault: boolean;
  hasApiToken: boolean;
};

export type UserAiProvidersPublic = {
  providers: UserAiProviderPublic[];
  availableToAdd: { providerKey: AiProviderKey; label: string }[];
};

export type UserAiProviderCredentials = {
  providerKey: AiProviderKey;
  defaultModel: string | null;
  baseUrl: string | null;
  isDefault: boolean;
  apiToken: string;
};

function toProviderPublic(row: {
  providerKey: string;
  defaultModel: string | null;
  baseUrl: string | null;
  isDefault: boolean;
  apiTokenEnc: string | null;
}): UserAiProviderPublic | null {
  if (!isAiProviderKey(row.providerKey)) {
    return null;
  }
  return {
    providerKey: row.providerKey,
    label: labelForAiProvider(row.providerKey),
    defaultModel: row.defaultModel,
    baseUrl: row.baseUrl,
    isDefault: row.isDefault,
    hasApiToken: Boolean(row.apiTokenEnc),
  };
}

const providerSelect = {
  providerKey: true,
  defaultModel: true,
  baseUrl: true,
  isDefault: true,
  apiTokenEnc: true,
} as const;

export async function listUserAiProvidersPublic(
  userId: string,
): Promise<UserAiProvidersPublic> {
  const rows = await prisma.userAiProvider.findMany({
    where: { userId },
    orderBy: { providerKey: "asc" },
    select: providerSelect,
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

export async function listUserAiProvidersForRouting(userId: string) {
  const rows = await prisma.userAiProvider.findMany({
    where: { userId },
    select: providerSelect,
  });

  const providers: UserAiProviderPublic[] = [];
  for (const row of rows) {
    const pub = toProviderPublic(row);
    if (pub) {
      providers.push(pub);
    }
  }
  return providers;
}

export async function loadUserAiProviderCredentials(
  userId: string,
  providerKey: AiProviderKey,
): Promise<UserAiProviderCredentials | null> {
  const row = await prisma.userAiProvider.findUnique({
    where: { userId_providerKey: { userId, providerKey } },
    select: {
      providerKey: true,
      defaultModel: true,
      baseUrl: true,
      isDefault: true,
      apiTokenEnc: true,
    },
  });

  if (!row?.apiTokenEnc || !isAiProviderKey(row.providerKey)) {
    return null;
  }

  try {
    const apiToken = decryptUserAiProviderSecret(
      row.apiTokenEnc,
      userId,
      row.providerKey,
    );
    return {
      providerKey: row.providerKey,
      defaultModel: row.defaultModel,
      baseUrl: row.baseUrl,
      isDefault: row.isDefault,
      apiToken,
    };
  } catch (error) {
    if (error instanceof CredentialsCryptoError) {
      throw error;
    }
    throw error;
  }
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
    baseUrl: string | null;
    isDefault: boolean;
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
    baseUrl: input.baseUrl,
    isDefault: input.isDefault,
    ...(apiTokenEnc !== undefined ? { apiTokenEnc } : {}),
  };

  await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.userAiProvider.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    if (existing) {
      await tx.userAiProvider.update({
        where: {
          userId_providerKey: { userId, providerKey: input.providerKey },
        },
        data,
      });
    } else {
      await tx.userAiProvider.create({
        data: {
          userId,
          providerKey: input.providerKey,
          ...data,
          apiTokenEnc: apiTokenEnc ?? null,
        },
      });
    }
  });

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
