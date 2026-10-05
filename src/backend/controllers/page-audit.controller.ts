"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/backend/auth";
import { parseMeasurementJson } from "@/backend/lib/analysis/dto";
import { isPageAuditFresh } from "@/backend/lib/page-audit/cache";
import { buildWorkspacePageAuditDto } from "@/backend/lib/page-audit/dto";
import { fetchPageHtmlSignals } from "@/backend/lib/page-audit/fetch-resources";
import {
  generatePageAuditNarrative,
  resolvePageAuditLlmRoute,
} from "@/backend/lib/page-audit/narrative";
import { fetchPageSpeedMobile } from "@/backend/lib/page-audit/pagespeed";
import {
  buildPageAuditReport,
  hasPartialCollectSuccess,
} from "@/backend/lib/page-audit/report";
import type { PageAuditSources, WorkspacePageAuditDTO } from "@/backend/lib/page-audit/types";
import { resolveAuditUrl } from "@/backend/lib/page-audit/url";
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
  findWorkspacePageAuditByWorkspaceId,
  upsertWorkspacePageAudit,
} from "@/backend/models/page-audit.model";
import { findWorkspaceForUser } from "@/backend/models/workspace.model";
import {
  listUserAiProvidersForRouting,
  loadUserAiProviderCredentials,
} from "@/backend/models/user-ai-provider.model";

const runPageAuditSchema = z.object({
  path: z.string().max(500).optional(),
  force: z.boolean().optional(),
});

export type PageAuditActionResult =
  | { ok: true; data: WorkspacePageAuditDTO }
  | { ok: false; error: string };

export type PageAuditLoadResult =
  | { ok: true; data: WorkspacePageAuditDTO | null }
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

function buildDto(input: {
  workspaceId: string;
  workspaceName: string;
  siteUrl: string;
  row: Awaited<ReturnType<typeof findWorkspacePageAuditByWorkspaceId>>;
  requestedUrl: string;
  force: boolean;
  narrativeError?: string;
}): WorkspacePageAuditDTO | null {
  return buildWorkspacePageAuditDto({
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    siteUrl: input.siteUrl,
    row: input.row,
    requestedUrl: input.requestedUrl,
    force: input.force,
    narrativeError: input.narrativeError,
  });
}

async function runCollectAndPersist(input: {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  siteUrl: string;
  auditUrl: string;
}): Promise<PageAuditActionResult> {
  const [htmlResult, psResult] = await Promise.all([
    fetchPageHtmlSignals(input.auditUrl),
    fetchPageSpeedMobile(input.auditUrl),
  ]);

  const sources: PageAuditSources = {
    html: htmlResult.ok
      ? { status: "ok" }
      : { status: "failed", error: htmlResult.error },
    pagespeed: psResult.ok
      ? { status: "ok" }
      : { status: "failed", error: psResult.error },
    store: { status: "missing" },
  };

  if (!hasPartialCollectSuccess(sources)) {
    const existing = await findWorkspacePageAuditByWorkspaceId(input.workspaceId);
    if (existing) {
      const dto = buildDto({
        workspaceId: input.workspaceId,
        workspaceName: input.workspaceName,
        siteUrl: input.siteUrl,
        row: existing,
        requestedUrl: input.auditUrl,
        force: true,
        narrativeError:
          "Coleta falhou (HTML e PageSpeed indisponíveis). Relatório anterior mantido.",
      });
      if (dto) {
        return { ok: true, data: dto };
      }
    }
    return {
      ok: false,
      error: "Não foi possível coletar HTML nem PageSpeed para esta URL.",
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
    collectedAt,
    sources,
    html: htmlResult.ok ? htmlResult.signals : null,
    pagespeed: psResult.ok ? psResult.signals : null,
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

  const row = await upsertWorkspacePageAudit({
    workspaceId: input.workspaceId,
    url: input.auditUrl,
    reportJson: report,
    narrativeJson: llmResult.ok ? llmResult.narrative : null,
    status: llmResult.ok ? "complete" : "narrative_failed",
    aiProviderKey: llmResult.ok ? llmResult.providerKey : null,
    aiModel: llmResult.ok ? llmResult.model : null,
    aiRoute: llmResult.ok ? llmResult.route : null,
    collectedAt,
  });

  revalidatePath(`/lojas/${input.workspaceId}/seo`);
  revalidatePath(`/lojas/${input.workspaceId}/cro`);

  const dto = buildDto({
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    siteUrl: input.siteUrl,
    row,
    requestedUrl: input.auditUrl,
    force: true,
    narrativeError: llmResult.ok ? undefined : llmResult.error,
  });

  if (!dto) {
    return { ok: false, error: "Falha ao montar relatório." };
  }

  return { ok: true, data: dto };
}

export async function getWorkspacePageAudit(
  workspaceId: string,
): Promise<PageAuditLoadResult> {
  const userId = await requireUserId();
  const workspace = await findWorkspaceForUser(userId, workspaceId);
  if (!workspace) {
    return { ok: false, error: "Loja não encontrada." };
  }

  const row = await findWorkspacePageAuditByWorkspaceId(workspaceId);
  const requestedUrl = row?.url ?? resolveAuditUrl(workspace.siteUrl);

  return {
    ok: true,
    data: buildDto({
      workspaceId,
      workspaceName: workspace.name,
      siteUrl: workspace.siteUrl,
      row,
      requestedUrl,
      force: false,
    }),
  };
}

export async function runWorkspacePageAudit(
  workspaceId: string,
  raw?: { path?: string; force?: boolean },
): Promise<PageAuditActionResult> {
  const parsed = runPageAuditSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return { ok: false, error: "Parâmetros inválidos." };
  }

  const userId = await requireUserId();
  const workspace = await findWorkspaceForUser(userId, workspaceId);
  if (!workspace) {
    return { ok: false, error: "Loja não encontrada." };
  }

  let auditUrl: string;
  try {
    auditUrl = resolveAuditUrl(workspace.siteUrl, parsed.data.path);
  } catch (err) {
    const message = err instanceof Error ? err.message : "URL inválida.";
    return { ok: false, error: message };
  }

  const force = parsed.data.force ?? false;
  const existing = await findWorkspacePageAuditByWorkspaceId(workspaceId);

  if (
    existing &&
    isPageAuditFresh({
      collectedAt: existing.collectedAt,
      storedUrl: existing.url,
      requestedUrl: auditUrl,
      force,
    })
  ) {
    const dto = buildDto({
      workspaceId,
      workspaceName: workspace.name,
      siteUrl: workspace.siteUrl,
      row: existing,
      requestedUrl: auditUrl,
      force: false,
    });
    if (!dto) {
      return { ok: false, error: "Falha ao carregar relatório." };
    }
    return { ok: true, data: dto };
  }

  return runCollectAndPersist({
    userId,
    workspaceId,
    workspaceName: workspace.name,
    siteUrl: workspace.siteUrl,
    auditUrl,
  });
}
