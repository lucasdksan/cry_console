"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/backend/auth";
import { parseMeasurementJson } from "@/backend/lib/analysis/dto";
import { buildRoleAuditPlan } from "@/backend/lib/page-audit/audit-paths";
import { isValidChecklistItemKey } from "@/backend/lib/page-audit/checklist";
import { isPageAuditFresh } from "@/backend/lib/page-audit/cache";
import { buildWorkspacePageAuditSetDto } from "@/backend/lib/page-audit/dto";
import { fetchPageHtmlSignals } from "@/backend/lib/page-audit/fetch-resources";
import {
  generatePageAuditNarrative,
  resolvePageAuditLlmRoute,
} from "@/backend/lib/page-audit/narrative";
import { fetchPageSpeedDesktop, fetchPageSpeedMobile } from "@/backend/lib/page-audit/pagespeed";
import {
  buildPageAuditReport,
  hasPartialCollectSuccess,
} from "@/backend/lib/page-audit/report";
import type { PageAuditPathsInput, PageAuditSources, WorkspacePageAuditSetDTO } from "@/backend/lib/page-audit/types";
import type { PageAuditRoleId } from "@/backend/lib/page-audit/roles";
import {
  isPlatformGeminiConfigured,
  readPlatformGeminiConfig,
} from "@/backend/lib/ai/platform-config";
import { resolveAiRoute, type AiRouteProviderInput } from "@/backend/lib/ai/route";
import {
  createAiUsageLog,
  findWorkspaceAnalysisByWorkspaceId,
} from "@/backend/models/workspace-analysis.model";
import {
  findWorkspacePageAuditByWorkspaceAndRole,
  listWorkspacePageAuditsByWorkspaceId,
  upsertWorkspacePageAudit,
} from "@/backend/models/page-audit.model";
import {
  listWorkspaceSeoChecklistItems,
  upsertWorkspaceSeoChecklistItem,
} from "@/backend/models/seo-checklist.model";
import { findWorkspaceForUser } from "@/backend/models/workspace.model";
import {
  listUserAiProvidersForRouting,
  loadUserAiProviderCredentials,
} from "@/backend/models/user-ai-provider.model";
import type { PageAuditRole, SeoChecklistItemStatus } from "@/generated/prisma/client";

const pathsSchema = z.object({
  home: z.string().max(500).optional(),
  category: z.string().max(500).optional(),
  product: z.string().max(500).optional(),
  search: z.string().max(500).optional(),
});

const runPageAuditSetSchema = z.object({
  paths: pathsSchema.optional(),
  force: z.boolean().optional(),
});

const updateChecklistSchema = z.object({
  itemKey: z.string().min(1).max(120),
  status: z.enum(["pending", "done", "not_applicable"]),
});

export type PageAuditSetActionResult =
  | { ok: true; data: WorkspacePageAuditSetDTO }
  | { ok: false; error: string };

export type PageAuditSetLoadResult =
  | { ok: true; data: WorkspacePageAuditSetDTO }
  | { ok: false; error: string };

export type ChecklistUpdateResult = { ok: true } | { ok: false; error: string };

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

async function loadSetDto(input: {
  workspaceId: string;
  workspaceName: string;
  siteUrl: string;
  requestedUrlsByRole: Partial<Record<string, string>>;
  force: boolean;
  narrativeErrors?: Partial<Record<string, string>>;
}): Promise<WorkspacePageAuditSetDTO> {
  const [rows, checklistRows] = await Promise.all([
    listWorkspacePageAuditsByWorkspaceId(input.workspaceId),
    listWorkspaceSeoChecklistItems(input.workspaceId),
  ]);

  return buildWorkspacePageAuditSetDto({
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    siteUrl: input.siteUrl,
    rows,
    checklistRows,
    requestedUrlsByRole: input.requestedUrlsByRole,
    force: input.force,
    narrativeErrors: input.narrativeErrors,
  });
}

async function runCollectAndPersistRole(input: {
  userId: string;
  workspaceId: string;
  role: PageAuditRole;
  auditUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string; keptPrevious: boolean }> {
  const [htmlResult, psMobile, psDesktop] = await Promise.all([
    fetchPageHtmlSignals(input.auditUrl),
    fetchPageSpeedMobile(input.auditUrl),
    fetchPageSpeedDesktop(input.auditUrl),
  ]);

  const pagespeed = {
    mobile: psMobile.ok ? psMobile.signals : null,
    desktop: psDesktop.ok ? psDesktop.signals : null,
  };

  const sources: PageAuditSources = {
    html: htmlResult.ok
      ? { status: "ok" }
      : { status: "failed", error: htmlResult.error },
    pagespeed:
      psMobile.ok || psDesktop.ok
        ? { status: "ok" }
        : {
            status: "failed",
            error: psMobile.ok ? psDesktop.error : psMobile.error,
          },
    store: { status: "missing" },
  };

  if (!hasPartialCollectSuccess(sources)) {
    const existing = await findWorkspacePageAuditByWorkspaceAndRole(
      input.workspaceId,
      input.role,
    );
    return {
      ok: false,
      error: "Não foi possível coletar HTML nem PageSpeed para esta URL.",
      keptPrevious: Boolean(existing),
    };
  }

  const analysisRow = await findWorkspaceAnalysisByWorkspaceId(input.workspaceId);
  let measurement = null;
  if (analysisRow) {
    try {
      measurement = parseMeasurementJson(analysisRow.measurementJson);
      sources.store = { status: "ok" };
    } catch {
      sources.store = { status: "missing" };
    }
  }

  const collectedAt = new Date();
  const report = buildPageAuditReport({
    url: input.auditUrl,
    role: input.role as PageAuditRoleId,
    collectedAt,
    sources,
    html: htmlResult.ok ? htmlResult.signals : null,
    pagespeed,
    measurement,
  });

  const providers = await listUserAiProvidersForRouting(input.userId);
  const routeInput = toRouteInput(providers);
  const aiRoute = resolveAiRoute({
    executionContext: "server",
    chromeReady: false,
    providers: routeInput,
    platformGeminiConfigured: isPlatformGeminiConfigured(),
  });

  let credentials = null;
  if (aiRoute.kind === "user") {
    credentials = await loadUserAiProviderCredentials(input.userId, aiRoute.providerKey);
  }

  const platformConfig = readPlatformGeminiConfig();
  const llmResolved = resolvePageAuditLlmRoute({
    route: aiRoute,
    credentials,
    providers: routeInput,
    platformModel: platformConfig.model,
  });

  let llmResult:
    | Awaited<ReturnType<typeof generatePageAuditNarrative>>
    | { ok: false; error: string } = {
    ok: false,
    error: "IA não configurada.",
  };

  if (!("error" in llmResolved)) {
    llmResult = await generatePageAuditNarrative({
      report,
      llmRoute: llmResolved,
    });
  } else {
    llmResult = { ok: false, error: llmResolved.error };
  }

  if (llmResult.ok) {
    await createAiUsageLog({
      userId: input.userId,
      workspaceId: input.workspaceId,
      purpose: "page_audit",
      route: llmResult.route,
      providerKey: llmResult.providerKey,
      model: llmResult.model,
    });
  }

  await upsertWorkspacePageAudit({
    workspaceId: input.workspaceId,
    role: input.role,
    url: input.auditUrl,
    reportJson: report,
    narrativeJson: llmResult.ok ? llmResult.narrative : null,
    status: llmResult.ok ? "complete" : "narrative_failed",
    aiProviderKey: llmResult.ok ? llmResult.providerKey : null,
    aiModel: llmResult.ok ? llmResult.model : null,
    aiRoute: llmResult.ok ? llmResult.route : null,
    collectedAt,
  });

  return { ok: true };
}

export async function getWorkspacePageAuditSet(
  workspaceId: string,
): Promise<PageAuditSetLoadResult> {
  const userId = await requireUserId();
  const workspace = await findWorkspaceForUser(userId, workspaceId);
  if (!workspace) {
    return { ok: false, error: "Loja não encontrada." };
  }

  const rows = await listWorkspacePageAuditsByWorkspaceId(workspaceId);
  const requestedUrlsByRole: Partial<Record<string, string>> = {};
  for (const row of rows) {
    requestedUrlsByRole[row.role] = row.url;
  }

  return {
    ok: true,
    data: await loadSetDto({
      workspaceId,
      workspaceName: workspace.name,
      siteUrl: workspace.siteUrl,
      requestedUrlsByRole,
      force: false,
    }),
  };
}

/** @deprecated Use getWorkspacePageAuditSet */
export async function getWorkspacePageAudit(workspaceId: string) {
  return getWorkspacePageAuditSet(workspaceId);
}

export async function runWorkspacePageAuditSet(
  workspaceId: string,
  raw?: { paths?: PageAuditPathsInput; force?: boolean },
): Promise<PageAuditSetActionResult> {
  const parsed = runPageAuditSetSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return { ok: false, error: "Parâmetros inválidos." };
  }

  const userId = await requireUserId();
  const workspace = await findWorkspaceForUser(userId, workspaceId);
  if (!workspace) {
    return { ok: false, error: "Loja não encontrada." };
  }

  let plan;
  try {
    plan = buildRoleAuditPlan(workspace.siteUrl, parsed.data.paths ?? {});
  } catch (err) {
    const message = err instanceof Error ? err.message : "URL inválida.";
    return { ok: false, error: message };
  }

  const force = parsed.data.force ?? false;
  const narrativeErrors: Partial<Record<string, string>> = {};
  let anySuccess = false;
  let lastError: string | null = null;

  for (const item of plan) {
    const existing = await findWorkspacePageAuditByWorkspaceAndRole(workspaceId, item.role);
    if (
      existing &&
      isPageAuditFresh({
        collectedAt: existing.collectedAt,
        storedUrl: existing.url,
        requestedUrl: item.auditUrl,
        force,
      })
    ) {
      anySuccess = true;
      continue;
    }

    const result = await runCollectAndPersistRole({
      userId,
      workspaceId,
      role: item.role,
      auditUrl: item.auditUrl,
    });

    if (result.ok) {
      anySuccess = true;
    } else {
      lastError = result.error;
      if (result.keptPrevious) {
        narrativeErrors[item.role] = `${result.error} Relatório anterior mantido.`;
      }
    }
  }

  revalidatePath(`/lojas/${workspaceId}/seo`);
  revalidatePath(`/lojas/${workspaceId}/cro`);

  const requestedUrlsByRole = Object.fromEntries(plan.map((p) => [p.role, p.auditUrl]));

  if (!anySuccess && lastError) {
    return { ok: false, error: lastError };
  }

  return {
    ok: true,
    data: await loadSetDto({
      workspaceId,
      workspaceName: workspace.name,
      siteUrl: workspace.siteUrl,
      requestedUrlsByRole,
      force: true,
      narrativeErrors,
    }),
  };
}

/** @deprecated Use runWorkspacePageAuditSet */
export async function runWorkspacePageAudit(
  workspaceId: string,
  raw?: { path?: string; force?: boolean },
) {
  return runWorkspacePageAuditSet(workspaceId, {
    force: raw?.force,
    paths: raw?.path ? { home: raw.path } : undefined,
  });
}

export async function updateSeoChecklistItem(
  workspaceId: string,
  raw: { itemKey: string; status: SeoChecklistItemStatus },
): Promise<ChecklistUpdateResult> {
  const parsed = updateChecklistSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Parâmetros inválidos." };
  }

  if (!isValidChecklistItemKey(parsed.data.itemKey)) {
    return { ok: false, error: "Item de checklist desconhecido." };
  }

  const userId = await requireUserId();
  const workspace = await findWorkspaceForUser(userId, workspaceId);
  if (!workspace) {
    return { ok: false, error: "Loja não encontrada." };
  }

  await upsertWorkspaceSeoChecklistItem({
    workspaceId,
    itemKey: parsed.data.itemKey,
    status: parsed.data.status,
  });

  revalidatePath(`/lojas/${workspaceId}/seo`);

  return { ok: true };
}
