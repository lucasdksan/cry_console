import { prisma } from "@/backend/models/prisma";
import type { WorkspaceAnalysisStatus, WorkspacePageAudit } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

export type WorkspacePageAuditUpsertInput = {
  workspaceId: string;
  url: string;
  reportJson: Prisma.InputJsonValue;
  narrativeJson?: Prisma.InputJsonValue | null;
  status: WorkspaceAnalysisStatus;
  aiProviderKey?: string | null;
  aiModel?: string | null;
  aiRoute?: string | null;
  collectedAt: Date;
};

export async function findWorkspacePageAuditByWorkspaceId(
  workspaceId: string,
): Promise<WorkspacePageAudit | null> {
  return prisma.workspacePageAudit.findUnique({
    where: { workspaceId },
  });
}

export async function upsertWorkspacePageAudit(
  input: WorkspacePageAuditUpsertInput,
): Promise<WorkspacePageAudit> {
  return prisma.workspacePageAudit.upsert({
    where: { workspaceId: input.workspaceId },
    create: {
      workspaceId: input.workspaceId,
      url: input.url,
      reportJson: input.reportJson,
      narrativeJson:
        input.narrativeJson === undefined
          ? undefined
          : input.narrativeJson === null
            ? Prisma.JsonNull
            : input.narrativeJson,
      status: input.status,
      aiProviderKey: input.aiProviderKey ?? null,
      aiModel: input.aiModel ?? null,
      aiRoute: input.aiRoute ?? null,
      collectedAt: input.collectedAt,
    },
    update: {
      url: input.url,
      reportJson: input.reportJson,
      narrativeJson:
        input.narrativeJson === undefined
          ? undefined
          : input.narrativeJson === null
            ? Prisma.JsonNull
            : input.narrativeJson,
      status: input.status,
      aiProviderKey: input.aiProviderKey ?? null,
      aiModel: input.aiModel ?? null,
      aiRoute: input.aiRoute ?? null,
      collectedAt: input.collectedAt,
    },
  });
}
