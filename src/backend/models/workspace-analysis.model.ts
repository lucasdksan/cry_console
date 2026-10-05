import { prisma } from "@/backend/models/prisma";
import type {
  AiUsagePurpose,
  WorkspaceAnalysis,
  WorkspaceAnalysisStatus,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

export type WorkspaceAnalysisUpsertInput = {
  workspaceId: string;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  overallScore: number | null;
  overallStatus: string;
  measurementJson: Prisma.InputJsonValue;
  narrativeJson?: Prisma.InputJsonValue | null;
  status: WorkspaceAnalysisStatus;
  aiProviderKey?: string | null;
  aiModel?: string | null;
  aiRoute?: string | null;
  collectedAt: Date;
};

export async function findWorkspaceAnalysisByWorkspaceId(
  workspaceId: string,
): Promise<WorkspaceAnalysis | null> {
  return prisma.workspaceAnalysis.findUnique({
    where: { workspaceId },
  });
}

export async function upsertWorkspaceAnalysis(
  input: WorkspaceAnalysisUpsertInput,
): Promise<WorkspaceAnalysis> {
  return prisma.workspaceAnalysis.upsert({
    where: { workspaceId: input.workspaceId },
    create: {
      workspaceId: input.workspaceId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      periodLabel: input.periodLabel,
      overallScore: input.overallScore,
      overallStatus: input.overallStatus,
      measurementJson: input.measurementJson,
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
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      periodLabel: input.periodLabel,
      overallScore: input.overallScore,
      overallStatus: input.overallStatus,
      measurementJson: input.measurementJson,
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

export async function createAiUsageLog(input: {
  userId: string;
  workspaceId: string;
  purpose: AiUsagePurpose;
  route: string;
  providerKey?: string | null;
  model?: string | null;
}): Promise<void> {
  await prisma.aiUsageLog.create({
    data: {
      userId: input.userId,
      workspaceId: input.workspaceId,
      purpose: input.purpose,
      route: input.route,
      providerKey: input.providerKey ?? null,
      model: input.model ?? null,
    },
  });
}
