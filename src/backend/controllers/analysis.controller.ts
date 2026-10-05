"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/backend/auth";
import {
  collectAnalysisInputs,
  isAnalysisCollectFresh,
} from "@/backend/lib/analysis/collect";
import { buildWorkspaceAnalysisDto } from "@/backend/lib/analysis/dto";
import {
  generateAnalysisNarrative,
  resolveAnalysisLlmRoute,
} from "@/backend/lib/analysis/llm";
import type { AnalysisMeasurementJson } from "@/backend/lib/analysis/types";
import {
  isPlatformGeminiConfigured,
  readPlatformGeminiConfig,
} from "@/backend/lib/ai/platform-config";
import {
  resolveAiRoute,
  type AiRouteProviderInput,
} from "@/backend/lib/ai/route";
import {
  createAiUsageLog,
  findWorkspaceAnalysisByWorkspaceId,
  upsertWorkspaceAnalysis,
} from "@/backend/models/workspace-analysis.model";
import {
  listUserAiProvidersForRouting,
  loadUserAiProviderCredentials,
} from "@/backend/models/user-ai-provider.model";
import {
  findWorkspaceForUser,
  listWorkspacesForOverview,
} from "@/backend/models/workspace.model";

export type AnalysisActionResult =
  | { ok: true; data: ReturnType<typeof buildWorkspaceAnalysisDto> }
  | { ok: false; error: string };

export type AnalysisLoadResult =
  | { ok: true; data: ReturnType<typeof buildWorkspaceAnalysisDto> | null }
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

async function runNarrativeAndPersist(input: {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  measurement: AnalysisMeasurementJson;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  collectedAt: Date;
}): Promise<AnalysisActionResult> {
  const providers = await listUserAiProvidersForRouting(input.userId);
  const route = resolveAiRoute({
    executionContext: "server",
    chromeReady: false,
    providers: toRouteInput(providers),
    platformGeminiConfigured: isPlatformGeminiConfigured(),
  });

  const platform = readPlatformGeminiConfig();
  let credentials = null;
  if (route.kind === "user") {
    credentials = await loadUserAiProviderCredentials(
      input.userId,
      route.providerKey,
    );
  }

  const llmRoute = resolveAnalysisLlmRoute({
    route,
    credentials,
    providers: toRouteInput(providers),
    platformModel: platform.model,
  });

  if ("error" in llmRoute) {
    const row = await upsertWorkspaceAnalysis({
      workspaceId: input.workspaceId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      periodLabel: input.periodLabel,
      overallScore: input.measurement.overallScore,
      overallStatus: input.measurement.overallStatus,
      measurementJson: input.measurement,
      narrativeJson: null,
      status: "narrative_failed",
      collectedAt: input.collectedAt,
    });
    return {
      ok: true,
      data: buildWorkspaceAnalysisDto({
        workspaceId: input.workspaceId,
        workspaceName: input.workspaceName,
        row,
        narrativeError: llmRoute.error,
      }),
    };
  }

  const llmResult = await generateAnalysisNarrative({
    measurement: input.measurement,
    llmRoute,
  });

  if (llmResult.ok) {
    await createAiUsageLog({
      userId: input.userId,
      workspaceId: input.workspaceId,
      purpose: "analysis",
      route: llmResult.route,
      providerKey: llmResult.providerKey,
      model: llmResult.model,
    });
  }

  const row = await upsertWorkspaceAnalysis({
    workspaceId: input.workspaceId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    periodLabel: input.periodLabel,
    overallScore: input.measurement.overallScore,
    overallStatus: input.measurement.overallStatus,
    measurementJson: input.measurement,
    narrativeJson: llmResult.ok ? llmResult.narrative : null,
    status: llmResult.ok ? "complete" : "narrative_failed",
    aiProviderKey: llmResult.providerKey ?? null,
    aiModel: llmResult.model ?? null,
    aiRoute: llmResult.route ?? null,
    collectedAt: input.collectedAt,
  });

  revalidatePath(`/lojas/${input.workspaceId}/analise`);

  return {
    ok: true,
    data: buildWorkspaceAnalysisDto({
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName,
      row,
      narrativeError: llmResult.ok ? undefined : llmResult.error,
    }),
  };
}

export async function getWorkspaceAnalysis(
  workspaceId: string,
): Promise<AnalysisLoadResult> {
  const userId = await requireUserId();
  const workspace = await findWorkspaceForUser(userId, workspaceId);
  if (!workspace) {
    return { ok: false, error: "Loja não encontrada." };
  }

  const row = await findWorkspaceAnalysisByWorkspaceId(workspaceId);
  if (!row) {
    return { ok: true, data: null };
  }

  return {
    ok: true,
    data: buildWorkspaceAnalysisDto({
      workspaceId,
      workspaceName: workspace.name,
      row,
    }),
  };
}

export async function runWorkspaceAnalysis(
  workspaceId: string,
): Promise<AnalysisActionResult> {
  const userId = await requireUserId();
  const workspaces = await listWorkspacesForOverview(userId);
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) {
    return { ok: false, error: "Loja não encontrada." };
  }

  const collected = await collectAnalysisInputs({
    userId,
    workspaceId,
    workspace,
  });

  return runNarrativeAndPersist({
    userId,
    workspaceId,
    workspaceName: workspace.name,
    measurement: collected.measurement,
    periodStart: new Date(collected.period.start),
    periodEnd: new Date(collected.period.end),
    periodLabel: collected.period.label,
    collectedAt: collected.collectedAt,
  });
}

export async function retryWorkspaceAnalysisNarrative(
  workspaceId: string,
): Promise<AnalysisActionResult> {
  const userId = await requireUserId();
  const workspace = await findWorkspaceForUser(userId, workspaceId);
  if (!workspace) {
    return { ok: false, error: "Loja não encontrada." };
  }

  const existing = await findWorkspaceAnalysisByWorkspaceId(workspaceId);
  if (!existing) {
    return { ok: false, error: "Execute uma análise antes de gerar o plano." };
  }

  let measurement = existing.measurementJson as AnalysisMeasurementJson;
  let collectedAt = existing.collectedAt;
  let periodStart = existing.periodStart;
  let periodEnd = existing.periodEnd;
  let periodLabel = existing.periodLabel;

  if (!isAnalysisCollectFresh(existing.collectedAt)) {
    const workspaces = await listWorkspacesForOverview(userId);
    const overviewRow = workspaces.find((w) => w.id === workspaceId);
    if (!overviewRow) {
      return { ok: false, error: "Loja não encontrada." };
    }
    const collected = await collectAnalysisInputs({
      userId,
      workspaceId,
      workspace: overviewRow,
    });
    measurement = collected.measurement;
    collectedAt = collected.collectedAt;
    periodStart = new Date(collected.period.start);
    periodEnd = new Date(collected.period.end);
    periodLabel = collected.period.label;
  }

  return runNarrativeAndPersist({
    userId,
    workspaceId,
    workspaceName: workspace.name,
    measurement,
    periodStart,
    periodEnd,
    periodLabel,
    collectedAt,
  });
}
