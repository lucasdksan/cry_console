import {
  CredentialsCryptoError,
  encryptSecret,
  type SecretField,
} from "@/backend/lib/credentials-crypto";
import {
  MAX_WORKSPACES_PER_USER,
  normalizeWorkspaceNameKey,
} from "@/backend/lib/workspace-policy";
import { prisma } from "@/backend/models/prisma";
import type { Prisma, Workspace } from "@/generated/prisma/client";

export type WorkspacePublic = {
  id: string;
  name: string;
  siteUrl: string;
  vtexAccountName: string | null;
  vtexEnvironment: string | null;
  hasVtexAppKey: boolean;
  hasVtexAppToken: boolean;
  hasClarityToken: boolean;
  hasGaServiceAccount: boolean;
  gaClientEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkspaceSummary = Pick<WorkspacePublic, "id" | "name">;

function toWorkspacePublic(row: Workspace): WorkspacePublic {
  return {
    id: row.id,
    name: row.name,
    siteUrl: row.siteUrl,
    vtexAccountName: row.vtexAccountName,
    vtexEnvironment: row.vtexEnvironment,
    hasVtexAppKey: Boolean(row.vtexAppKeyEnc),
    hasVtexAppToken: Boolean(row.vtexAppTokenEnc),
    hasClarityToken: Boolean(row.clarityTokenEnc),
    hasGaServiceAccount: Boolean(row.gaServiceAccountEnc),
    gaClientEmail: row.gaClientEmail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listWorkspaceSummariesForUser(
  userId: string,
): Promise<WorkspaceSummary[]> {
  const rows = await prisma.workspace.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  return rows;
}

export async function getUserActiveWorkspaceId(
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeWorkspaceId: true },
  });
  return user?.activeWorkspaceId ?? null;
}

export async function findWorkspaceForUser(
  userId: string,
  workspaceId: string,
): Promise<WorkspacePublic | null> {
  const row = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
  });
  return row ? toWorkspacePublic(row) : null;
}

export async function countWorkspacesForUser(userId: string): Promise<number> {
  return prisma.workspace.count({ where: { userId } });
}

type SecretUpdates = Partial<
  Record<
    SecretField,
    { action: "set"; value: string } | { action: "clear" } | { action: "keep" }
  >
>;

type WorkspaceWriteInput = {
  name: string;
  siteUrl: string;
  vtexAccountName: string | null;
  vtexEnvironment: string | null;
  gaClientEmail: string | null;
  secrets: SecretUpdates;
};

function mapSecretColumn(field: SecretField): keyof Workspace {
  switch (field) {
    case "vtexAppKey":
      return "vtexAppKeyEnc";
    case "vtexAppToken":
      return "vtexAppTokenEnc";
    case "clarityToken":
      return "clarityTokenEnc";
    case "gaServiceAccount":
      return "gaServiceAccountEnc";
  }
}

function applySecretUpdates(
  workspaceId: string,
  secrets: SecretUpdates,
  base: Partial<Workspace>,
): Partial<Workspace> {
  const data = { ...base };

  for (const field of Object.keys(secrets) as SecretField[]) {
    const update = secrets[field];
    if (!update || update.action === "keep") {
      continue;
    }

    const column = mapSecretColumn(field);
    if (update.action === "clear") {
      (data as Record<string, unknown>)[column] = null;
      if (field === "gaServiceAccount") {
        data.gaClientEmail = null;
      }
      continue;
    }

    try {
      (data as Record<string, unknown>)[column] = encryptSecret(
        update.value,
        workspaceId,
        field,
      );
    } catch (error) {
      if (error instanceof CredentialsCryptoError) {
        throw error;
      }
      throw error;
    }
  }

  return data;
}

export class WorkspaceLimitError extends Error {
  constructor() {
    super("Você já atingiu o limite de 3 lojas.");
    this.name = "WorkspaceLimitError";
  }
}

export class WorkspaceNameConflictError extends Error {
  constructor() {
    super("Já existe uma loja com esse nome.");
    this.name = "WorkspaceNameConflictError";
  }
}

async function lockUserRow(tx: Prisma.TransactionClient, userId: string) {
  await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
}

export async function createWorkspaceForUser(
  userId: string,
  input: WorkspaceWriteInput,
): Promise<WorkspacePublic> {
  const nameKey = normalizeWorkspaceNameKey(input.name);

  return prisma.$transaction(async (tx) => {
    await lockUserRow(tx, userId);

    const count = await tx.workspace.count({ where: { userId } });
    if (count >= MAX_WORKSPACES_PER_USER) {
      throw new WorkspaceLimitError();
    }

    const existing = await tx.workspace.findUnique({
      where: { userId_nameKey: { userId, nameKey } },
    });
    if (existing) {
      throw new WorkspaceNameConflictError();
    }

    const created = await tx.workspace.create({
      data: {
        userId,
        name: input.name.trim(),
        nameKey,
        siteUrl: input.siteUrl,
        vtexAccountName: input.vtexAccountName,
        vtexEnvironment: input.vtexEnvironment,
        gaClientEmail: input.gaClientEmail,
      },
    });

    const withSecrets = applySecretUpdates(created.id, input.secrets, {
      vtexAccountName: input.vtexAccountName,
      vtexEnvironment: input.vtexEnvironment,
      gaClientEmail: input.gaClientEmail,
    });

    const updated =
      Object.keys(withSecrets).length > 0
        ? await tx.workspace.update({
            where: { id: created.id },
            data: withSecrets,
          })
        : created;

    await tx.user.update({
      where: { id: userId },
      data: { activeWorkspaceId: updated.id },
    });

    return toWorkspacePublic(updated);
  });
}

export async function updateWorkspaceForUser(
  userId: string,
  workspaceId: string,
  input: WorkspaceWriteInput,
): Promise<WorkspacePublic> {
  const nameKey = normalizeWorkspaceNameKey(input.name);

  return prisma.$transaction(async (tx) => {
    const current = await tx.workspace.findFirst({
      where: { id: workspaceId, userId },
    });
    if (!current) {
      throw new Error("Loja não encontrada.");
    }

    if (nameKey !== current.nameKey) {
      const conflict = await tx.workspace.findUnique({
        where: { userId_nameKey: { userId, nameKey } },
      });
      if (conflict) {
        throw new WorkspaceNameConflictError();
      }
    }

    let gaClientEmail = current.gaClientEmail;
    const gaSecret = input.secrets.gaServiceAccount;
    if (gaSecret?.action === "clear") {
      gaClientEmail = null;
    } else if (gaSecret?.action === "set" && input.gaClientEmail) {
      gaClientEmail = input.gaClientEmail;
    }

    const data = applySecretUpdates(workspaceId, input.secrets, {
      name: input.name.trim(),
      nameKey,
      siteUrl: input.siteUrl,
      vtexAccountName: input.vtexAccountName,
      vtexEnvironment: input.vtexEnvironment,
      gaClientEmail,
    });

    const updated = await tx.workspace.update({
      where: { id: workspaceId },
      data,
    });

    return toWorkspacePublic(updated);
  });
}

export async function setActiveWorkspaceForUser(
  userId: string,
  workspaceId: string,
): Promise<void> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
    select: { id: true },
  });
  if (!workspace) {
    throw new Error("Loja não encontrada.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { activeWorkspaceId: workspaceId },
  });
}

export async function clearWorkspaceSecretForUser(
  userId: string,
  workspaceId: string,
  field: SecretField,
): Promise<WorkspacePublic> {
  const secrets: SecretUpdates = {
    [field]: { action: "clear" },
  };

  const current = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
  });
  if (!current) {
    throw new Error("Loja não encontrada.");
  }

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: applySecretUpdates(workspaceId, secrets, {}),
  });

  return toWorkspacePublic(updated);
}

export async function deleteWorkspaceForUser(
  userId: string,
  workspaceId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.findFirst({
      where: { id: workspaceId, userId },
    });
    if (!workspace) {
      throw new Error("Loja não encontrada.");
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { activeWorkspaceId: true },
    });

    await tx.workspace.delete({ where: { id: workspaceId } });

    if (user?.activeWorkspaceId === workspaceId) {
      const fallback = await tx.workspace.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: { activeWorkspaceId: fallback?.id ?? null },
      });
    }
  });
}
