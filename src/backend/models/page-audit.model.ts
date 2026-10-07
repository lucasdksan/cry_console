import { prisma } from "@/backend/models/prisma";
import type {
  PageAuditRole,
  WorkspaceAnalysisStatus,
  WorkspacePageAudit,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

export type WorkspacePageAuditUpsertInput = {
  workspaceId: string;
  role: PageAuditRole;
  url: string;
  reportJson: Prisma.InputJsonValue;
  narrativeJson?: Prisma.InputJsonValue | null;
  status: WorkspaceAnalysisStatus;
  aiProviderKey?: string | null;
  aiModel?: string | null;
  aiRoute?: string | null;
  collectedAt: Date;
};

export async function listWorkspacePageAuditsByWorkspaceId(
  workspaceId: string,
): Promise<WorkspacePageAudit[]> {
  return prisma.workspacePageAudit.findMany({
    where: { workspaceId },
    orderBy: { role: "asc" },
  });
}

export async function findWorkspacePageAuditByWorkspaceAndRole(
  workspaceId: string,
  role: PageAuditRole,
): Promise<WorkspacePageAudit | null> {
  return prisma.workspacePageAudit.findUnique({
    where: {
      workspaceId_role: { workspaceId, role },
    },
  });
}

/** @deprecated Use list/find by role — kept for transitional imports */
export async function findWorkspacePageAuditByWorkspaceId(
  workspaceId: string,
): Promise<WorkspacePageAudit | null> {
  return findWorkspacePageAuditByWorkspaceAndRole(workspaceId, "home");
}

export async function upsertWorkspacePageAudit(
  input: WorkspacePageAuditUpsertInput,
): Promise<WorkspacePageAudit> {
  return prisma.workspacePageAudit.upsert({
    where: {
      workspaceId_role: {
        workspaceId: input.workspaceId,
        role: input.role,
      },
    },
    create: {
      workspaceId: input.workspaceId,
      role: input.role,
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
