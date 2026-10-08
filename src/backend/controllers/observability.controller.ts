"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/backend/auth";
import {
  createJavascriptProjectForWorkspace,
  isSentryServerConfigured,
  saveObservabilitySchema,
  SentryApiError,
  SentryConfigError,
} from "@/backend/lib/sentry";
import { loadIssueAnalysesForProject } from "@/backend/lib/sentry/issue-analysis";
import {
  OBSERVABILITY_ISSUE_ANALYSIS_LIMIT,
  type ObservabilityIssueAnalysisDTO,
} from "@/backend/lib/sentry/observability-dto";
import { findWorkspaceForUser } from "@/backend/models/workspace.model";
import {
  findObservabilityForUserWorkspace,
  findObservabilityInsightsContextForUser,
  saveObservabilityPatternsForUser,
} from "@/backend/models/observability.model";

export type ObservabilityActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }
  return session.user.id;
}

function fieldErrors(error: z.ZodError) {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

export async function saveObservability(
  _prevState: ObservabilityActionState,
  formData: FormData,
): Promise<ObservabilityActionState> {
  const userId = await requireUserId();
  const workspaceIdEntry = formData.get("workspaceId");
  const workspaceId =
    typeof workspaceIdEntry === "string" ? workspaceIdEntry.trim() : "";

  let patternsRaw: unknown;
  const patternsJson = formData.get("patternsJson");
  if (typeof patternsJson === "string" && patternsJson.trim()) {
    try {
      patternsRaw = JSON.parse(patternsJson);
    } catch {
      return { error: "Formato de padrões inválido." };
    }
  } else {
    patternsRaw = [];
  }

  const parsed = saveObservabilitySchema.safeParse({
    workspaceId,
    patterns: patternsRaw,
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error) };
  }

  const workspace = await findWorkspaceForUser(userId, workspaceId);
  if (!workspace) {
    return { error: "Loja não encontrada." };
  }

  const current = await findObservabilityForUserWorkspace(userId, workspaceId);

  if (parsed.data.patterns.length === 0) {
    try {
      await saveObservabilityPatternsForUser(
        userId,
        workspaceId,
        [],
      );
      revalidatePath(`/lojas/${workspaceId}`);
      return { success: "Observabilidade atualizada. Nenhuma página monitorada." };
    } catch {
      return { error: "Não foi possível salvar." };
    }
  }

  if (!isSentryServerConfigured()) {
    return {
      error:
        "Sentry não está configurado no servidor. Defina SENTRY_ORG_SLUG, SENTRY_TEAM_SLUG e SENTRY_AUTH_TOKEN.",
    };
  }

  let sentryProject;
  if (!current?.hasSentryProject) {
    try {
      const created = await createJavascriptProjectForWorkspace(
        workspaceId,
        workspace.name,
      );
      sentryProject = created;
    } catch (error) {
      if (error instanceof SentryConfigError || error instanceof SentryApiError) {
        return { error: error.message };
      }
      return { error: "Falha ao provisionar projeto no Sentry." };
    }
  }

  try {
    await saveObservabilityPatternsForUser(
      userId,
      workspaceId,
      parsed.data.patterns,
      sentryProject,
    );
    revalidatePath(`/lojas/${workspaceId}`);
    return { success: "Observabilidade salva. Copie o script abaixo para a loja." };
  } catch {
    return { error: "Não foi possível salvar a observabilidade." };
  }
}

const issueAnalysisRequestSchema = z.object({
  workspaceId: z.string().trim().min(1).max(64),
  issueIds: z
    .array(z.string().regex(/^\d{1,20}$/))
    .max(OBSERVABILITY_ISSUE_ANALYSIS_LIMIT),
});

export async function loadObservabilityIssueAnalyses(
  workspaceId: string,
  issueIds: string[],
): Promise<Record<string, ObservabilityIssueAnalysisDTO>> {
  const session = await auth();
  if (!session?.user?.id || !isSentryServerConfigured()) {
    return {};
  }

  const parsed = issueAnalysisRequestSchema.safeParse({ workspaceId, issueIds });
  if (!parsed.success || parsed.data.issueIds.length === 0) {
    return {};
  }

  const context = await findObservabilityInsightsContextForUser(
    session.user.id,
    parsed.data.workspaceId,
  );
  if (!context) {
    return {};
  }

  try {
    return await loadIssueAnalysesForProject({
      workspaceId: context.workspaceId,
      projectSlug: context.sentryProjectSlug,
      issueIds: parsed.data.issueIds,
    });
  } catch {
    return {};
  }
}
