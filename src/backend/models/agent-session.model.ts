import { prisma } from "@/backend/models/prisma";
import type {
  AgentChatMode,
  AgentMessageRole,
  AgentModelSource,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import type { AgentMessageParts } from "@/backend/lib/agent/types";

export type AgentSessionRow = {
  id: string;
  userId: string;
  workspaceId: string | null;
  mode: AgentChatMode;
  title: string;
  lastModelSource: AgentModelSource | null;
  lastProviderKey: string | null;
  lastModel: string | null;
  updatedAt: Date;
  createdAt: Date;
  workspace: { name: string } | null;
};

export async function listAgentSessionsForUser(
  userId: string,
  limit = 20,
): Promise<AgentSessionRow[]> {
  return prisma.agentSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      workspace: { select: { name: true } },
    },
  });
}

export async function findAgentSessionForUser(
  userId: string,
  sessionId: string,
): Promise<AgentSessionRow | null> {
  return prisma.agentSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      workspace: { select: { name: true } },
    },
  });
}

export async function createAgentSession(input: {
  userId: string;
  workspaceId?: string | null;
  mode?: AgentChatMode;
  title?: string;
}): Promise<AgentSessionRow> {
  return prisma.agentSession.create({
    data: {
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      mode: input.mode ?? "agent",
      title: input.title ?? "Nova conversa",
    },
    include: {
      workspace: { select: { name: true } },
    },
  });
}

export async function updateAgentSessionMeta(input: {
  sessionId: string;
  mode?: AgentChatMode;
  title?: string;
  lastModelSource?: AgentModelSource | null;
  lastProviderKey?: string | null;
  lastModel?: string | null;
}): Promise<void> {
  await prisma.agentSession.update({
    where: { id: input.sessionId },
    data: {
      mode: input.mode,
      title: input.title,
      lastModelSource: input.lastModelSource,
      lastProviderKey: input.lastProviderKey,
      lastModel: input.lastModel,
      updatedAt: new Date(),
    },
  });
}

export async function deleteAgentSessionForUser(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const result = await prisma.agentSession.deleteMany({
    where: { id: sessionId, userId },
  });
  return result.count > 0;
}

export type AgentMessageRow = {
  id: string;
  sessionId: string;
  role: AgentMessageRole;
  content: string;
  partsJson: unknown;
  modelSource: AgentModelSource | null;
  providerKey: string | null;
  model: string | null;
  createdAt: Date;
};

export async function listAgentMessages(
  sessionId: string,
): Promise<AgentMessageRow[]> {
  return prisma.agentMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
}

export async function appendAgentMessage(input: {
  sessionId: string;
  role: AgentMessageRole;
  content: string;
  parts?: AgentMessageParts | null;
  modelSource?: AgentModelSource | null;
  providerKey?: string | null;
  model?: string | null;
}): Promise<AgentMessageRow> {
  const partsJson =
    input.parts === null || input.parts === undefined
      ? undefined
      : (input.parts as Prisma.InputJsonValue);

  const row = await prisma.agentMessage.create({
    data: {
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      partsJson,
      modelSource: input.modelSource ?? null,
      providerKey: input.providerKey ?? null,
      model: input.model ?? null,
    },
  });

  await prisma.agentSession.update({
    where: { id: input.sessionId },
    data: { updatedAt: new Date() },
  });

  return row;
}

export function parseMessageParts(value: unknown): AgentMessageParts["parts"] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const parts = (value as { parts?: unknown }).parts;
  return Array.isArray(parts) ? (parts as AgentMessageParts["parts"]) : [];
}

export async function updateAgentMessageParts(input: {
  messageId: string;
  parts: AgentMessageParts;
}): Promise<void> {
  await prisma.agentMessage.update({
    where: { id: input.messageId },
    data: {
      partsJson: input.parts as Prisma.InputJsonValue,
    },
  });
}
