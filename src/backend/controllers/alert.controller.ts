"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/backend/auth";
import {
  extractMetricValues,
  isSnapshotCacheFresh,
} from "@/backend/lib/workspace-alert-metrics";
import { buildWorkspaceAvisosDto } from "@/backend/lib/workspace-avisos-dto";
import { resolveCalendarPeriod } from "@/backend/lib/workspace-period";
import {
  defaultMeasurementSources,
  runMeasurementCollect,
  type MeasurementSource,
} from "@/backend/lib/measurement";
import {
  assertWorkspaceOwnedByUser,
  deleteMetricTarget,
  findMetricSnapshotForDay,
  findLatestMetricSnapshotBeforeDay,
  listMetricTargetsForWorkspace,
  upsertMetricSnapshot,
  upsertMetricTarget,
} from "@/backend/models/workspace-metric.model";
import {
  findWorkspaceForUser,
  getWorkspaceMeasurementSecretsForUser,
  getWorkspaceVtexConfigForUser,
} from "@/backend/models/workspace.model";
import {
  isGa4Configured,
  isGscConfigured,
  isVtexConfigured,
} from "@/backend/lib/overview-status";
import { runVtexCollect } from "@/backend/lib/vtex/run-collectors";
import type { WorkspaceMetricKey } from "@/generated/prisma/client";

const SNAPSHOT_CACHE_MS = 15 * 60 * 1000;

const periodTypeSchema = z.enum(["week", "month"]);

const metricKeySchema = z.enum([
  "vtex_revenue",
  "vtex_orders",
  "ga4_sessions",
  "ga4_conversion_pct",
  "gsc_clicks",
]);

const saveTargetSchema = z.object({
  workspaceId: z.string().min(1),
  metricKey: metricKeySchema,
  periodType: periodTypeSchema,
  targetValue: z.coerce.number().positive(),
});

const clearTargetSchema = z.object({
  workspaceId: z.string().min(1),
  metricKey: metricKeySchema,
  periodType: periodTypeSchema,
});

export type AlertActionState = {
  error?: string;
  success?: string;
};

export type AvisosActionResult =
  | { ok: true; data: ReturnType<typeof buildWorkspaceAvisosDto> }
  | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }
  return session.user.id;
}

async function loadSnapshotForPeriod(
  userId: string,
  workspaceId: string,
  periodType: "week" | "month",
) {
  const workspace = await findWorkspaceForUser(userId, workspaceId);
  if (!workspace) {
    return { error: "Loja não encontrada." as const };
  }

  const period = resolveCalendarPeriod(periodType);
  const existing = await findMetricSnapshotForDay(
    workspaceId,
    periodType,
    period.capturedOn,
  );

  const cacheFresh = isSnapshotCacheFresh(
    existing,
    Date.now(),
    SNAPSHOT_CACHE_MS,
  );

  if (cacheFresh) {
    return {
      workspace,
      period,
      snapshot: existing,
      snapshotStale: false,
    };
  }

  const measurementSources: MeasurementSource[] = [];
  if (isGa4Configured(workspace)) {
    measurementSources.push("analytics");
  }
  if (isGscConfigured(workspace)) {
    measurementSources.push("search-console");
  }

  let vtexResult: Awaited<ReturnType<typeof runVtexCollect>> | null = null;
  let vtexError: string | undefined;
  let measurementResult: Awaited<ReturnType<typeof runMeasurementCollect>> | null =
    null;

  const vtexPromise = (async () => {
    if (!isVtexConfigured(workspace)) {
      return;
    }
    try {
      const config = await getWorkspaceVtexConfigForUser(userId, workspaceId);
      vtexResult = await runVtexCollect({
        config: {
          account: config.account,
          environment: config.environment,
          appKey: config.appKey,
          appToken: config.appToken,
        },
        siteUrl: config.siteUrl,
        period: { start: period.start, end: period.collectEnd },
        collectors: ["orders"],
      });
    } catch (error) {
      vtexError =
        error instanceof Error
          ? error.message
          : "Não foi possível coletar dados VTEX.";
    }
  })();

  const measurementPromise = (async () => {
    if (measurementSources.length === 0) {
      return;
    }
    try {
      const secrets = await getWorkspaceMeasurementSecretsForUser(
        userId,
        workspaceId,
      );
      measurementResult = await runMeasurementCollect({
        secrets,
        period: { start: period.start, end: period.collectEnd },
        sources: measurementSources.length
          ? measurementSources
          : defaultMeasurementSources(),
        gaPropertyId: workspace.gaPropertyId ?? undefined,
      });
    } catch {
      measurementResult = null;
    }
  })();

  await Promise.all([vtexPromise, measurementPromise]);

  const extracted = extractMetricValues({
    vtex: vtexResult,
    vtexError,
    measurement: measurementResult,
    vtexConfigured: isVtexConfigured(workspace),
    ga4Configured: isGa4Configured(workspace),
    gscConfigured: isGscConfigured(workspace),
  });

  let snapshot = await upsertMetricSnapshot({
    workspaceId,
    periodType,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    capturedOn: period.capturedOn,
    collectedAt: new Date(),
    vtexRevenue: extracted.vtexRevenue,
    vtexOrders: extracted.vtexOrders,
    ga4Sessions: extracted.ga4Sessions,
    ga4ConversionPct: extracted.ga4ConversionPct,
    gscClicks: extracted.gscClicks,
    vtexStatus: extracted.vtexStatus,
    ga4Status: extracted.ga4Status,
    gscStatus: extracted.gscStatus,
    vtexError: extracted.vtexError,
    ga4Error: extracted.ga4Error,
    gscError: extracted.gscError,
  });

  const allFailed =
    extracted.vtexStatus === "failed" &&
    extracted.ga4Status === "failed" &&
    extracted.gscStatus === "failed";

  if (allFailed && existing) {
    snapshot = existing;
  } else if (allFailed && !existing) {
    const fallback = await findLatestMetricSnapshotBeforeDay(
      workspaceId,
      periodType,
      period.capturedOn,
    );
    if (fallback) {
      snapshot = fallback;
    }
  }

  return {
    workspace,
    period,
    snapshot,
    snapshotStale: allFailed && Boolean(existing ?? snapshot),
  };
}

export async function getWorkspaceAvisos(
  workspaceId: string,
  periodTypeInput: "week" | "month" = "month",
): Promise<AvisosActionResult> {
  const userId = await requireUserId();
  const periodType = periodTypeSchema.parse(periodTypeInput);

  const loaded = await loadSnapshotForPeriod(userId, workspaceId, periodType);
  if ("error" in loaded) {
    return { ok: false, error: loaded.error };
  }

  const targets = await listMetricTargetsForWorkspace(workspaceId);
  const data = buildWorkspaceAvisosDto({
    workspaceId,
    workspaceName: loaded.workspace.name,
    periodType,
    period: loaded.period,
    targets,
    snapshot: loaded.snapshot,
    snapshotStale: loaded.snapshotStale,
  });

  return { ok: true, data };
}

export async function saveWorkspaceMetricTarget(
  _prev: AlertActionState,
  formData: FormData,
): Promise<AlertActionState> {
  const userId = await requireUserId();
  const parsed = saveTargetSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    metricKey: formData.get("metricKey"),
    periodType: formData.get("periodType"),
    targetValue: formData.get("targetValue"),
  });

  if (!parsed.success) {
    return { error: "Meta inválida." };
  }

  const { workspaceId, metricKey, periodType, targetValue } = parsed.data;
  const owned = await assertWorkspaceOwnedByUser(userId, workspaceId);
  if (!owned) {
    return { error: "Loja não encontrada." };
  }

  await upsertMetricTarget(
    workspaceId,
    metricKey as WorkspaceMetricKey,
    periodType,
    targetValue,
  );

  revalidatePath(`/lojas/${workspaceId}/avisos`);

  return { success: "Meta salva." };
}

export async function clearWorkspaceMetricTarget(
  _prev: AlertActionState,
  formData: FormData,
): Promise<AlertActionState> {
  const userId = await requireUserId();
  const parsed = clearTargetSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    metricKey: formData.get("metricKey"),
    periodType: formData.get("periodType"),
  });

  if (!parsed.success) {
    return { error: "Dados inválidos." };
  }

  const { workspaceId, metricKey, periodType } = parsed.data;
  const owned = await assertWorkspaceOwnedByUser(userId, workspaceId);
  if (!owned) {
    return { error: "Loja não encontrada." };
  }

  await deleteMetricTarget(
    workspaceId,
    metricKey as WorkspaceMetricKey,
    periodType,
  );

  revalidatePath(`/lojas/${workspaceId}/avisos`);

  return { success: "Meta removida." };
}
