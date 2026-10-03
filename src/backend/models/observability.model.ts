import { randomBytes } from "node:crypto";

import type { PathPattern } from "@/backend/lib/sentry/pathname-glob";
import { prisma } from "@/backend/models/prisma";
import type {
  ObservabilityPageType,
  ObservabilityPagePattern,
  WorkspaceObservability,
} from "@/generated/prisma/client";

export type ObservabilityPatternPublic = {
  id: string;
  pageType: "home" | "pdp" | "plp";
  pathnameGlob: string;
};

export type ObservabilityPublic = {
  workspaceId: string;
  publicKey: string;
  hasSentryProject: boolean;
  patterns: ObservabilityPatternPublic[];
};

export type ObservabilityTunnelContext = {
  publicKey: string;
  sentryPublicKey: string;
  sentryIngestHost: string;
  sentryProjectId: string;
  patterns: PathPattern[];
};

function toPatternPublic(
  row: ObservabilityPagePattern,
): ObservabilityPatternPublic {
  return {
    id: row.id,
    pageType: row.pageType,
    pathnameGlob: row.pathnameGlob,
  };
}

function toObservabilityPublic(
  row: WorkspaceObservability & { pagePatterns: ObservabilityPagePattern[] },
): ObservabilityPublic {
  return {
    workspaceId: row.workspaceId,
    publicKey: row.publicKey,
    hasSentryProject: Boolean(
      row.sentryProjectSlug && row.sentryPublicKey && row.sentryIngestHost,
    ),
    patterns: row.pagePatterns.map(toPatternPublic),
  };
}

function createPublicKey(): string {
  return randomBytes(24).toString("base64url");
}

export async function findObservabilityForUserWorkspace(
  userId: string,
  workspaceId: string,
): Promise<ObservabilityPublic | null> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
    select: { id: true },
  });
  if (!workspace) {
    return null;
  }

  const row = await prisma.workspaceObservability.findUnique({
    where: { workspaceId },
    include: { pagePatterns: { orderBy: { createdAt: "asc" } } },
  });

  if (!row) {
    return {
      workspaceId,
      publicKey: "",
      hasSentryProject: false,
      patterns: [],
    };
  }

  return toObservabilityPublic(row);
}

export async function findObservabilityByPublicKey(
  publicKey: string,
): Promise<ObservabilityTunnelContext | null> {
  const row = await prisma.workspaceObservability.findUnique({
    where: { publicKey },
    include: { pagePatterns: true },
  });
  if (
    !row?.sentryPublicKey ||
    !row.sentryIngestHost ||
    !row.sentryProjectId
  ) {
    return null;
  }

  return {
    publicKey: row.publicKey,
    sentryPublicKey: row.sentryPublicKey,
    sentryIngestHost: row.sentryIngestHost,
    sentryProjectId: row.sentryProjectId,
    patterns: row.pagePatterns.map((p) => ({
      pageType: p.pageType,
      pathnameGlob: p.pathnameGlob,
    })),
  };
}

export type SentryProjectPersistence = {
  projectId: string;
  projectSlug: string;
  publicKey: string;
  ingestHost: string;
};

export async function saveObservabilityPatternsForUser(
  userId: string,
  workspaceId: string,
  patterns: Array<{ pageType: "home" | "pdp" | "plp"; pathnameGlob: string }>,
  sentryProject?: SentryProjectPersistence,
): Promise<ObservabilityPublic> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
  });
  if (!workspace) {
    throw new Error("Loja não encontrada.");
  }

  return prisma.$transaction(async (tx) => {
    let obs = await tx.workspaceObservability.findUnique({
      where: { workspaceId },
      include: { pagePatterns: true },
    });

    if (!obs) {
      obs = await tx.workspaceObservability.create({
        data: {
          workspaceId,
          publicKey: createPublicKey(),
        },
        include: { pagePatterns: true },
      });
    }

    if (sentryProject) {
      obs = await tx.workspaceObservability.update({
        where: { id: obs.id },
        data: {
          sentryProjectId: sentryProject.projectId,
          sentryProjectSlug: sentryProject.projectSlug,
          sentryPublicKey: sentryProject.publicKey,
          sentryIngestHost: sentryProject.ingestHost,
        },
        include: { pagePatterns: true },
      });
    }

    await tx.observabilityPagePattern.deleteMany({
      where: { observabilityId: obs.id },
    });

    if (patterns.length > 0) {
      await tx.observabilityPagePattern.createMany({
        data: patterns.map((p) => ({
          observabilityId: obs!.id,
          pageType: p.pageType as ObservabilityPageType,
          pathnameGlob: p.pathnameGlob.trim(),
        })),
      });
    }

    const refreshed = await tx.workspaceObservability.findUniqueOrThrow({
      where: { id: obs.id },
      include: { pagePatterns: { orderBy: { createdAt: "asc" } } },
    });

    return toObservabilityPublic(refreshed);
  });
}

export async function getSentryProjectSlugForUserWorkspace(
  userId: string,
  workspaceId: string,
): Promise<string | null> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
    select: { id: true },
  });
  if (!workspace) {
    return null;
  }

  const row = await prisma.workspaceObservability.findUnique({
    where: { workspaceId },
    select: { sentryProjectSlug: true },
  });
  return row?.sentryProjectSlug ?? null;
}
