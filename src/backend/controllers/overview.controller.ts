"use server";

import { redirect } from "next/navigation";

import { auth } from "@/backend/auth";
import { buildOverviewDto } from "@/backend/lib/overview/metrics";
import { lastNDaysPeriod } from "@/backend/lib/overview/period";
import type { OverviewDTO } from "@/backend/lib/overview/types";
import {
  isClarityConfigured,
  isGa4Configured,
  isGscConfigured,
  isVtexConfigured,
} from "@/backend/lib/overview/status";
import {
  defaultMeasurementSources,
  runMeasurementCollect,
  type MeasurementSource,
} from "@/backend/lib/measurement";
import { runVtexCollect } from "@/backend/lib/vtex/run-collectors";
import {
  getWorkspaceMeasurementSecretsForUser,
  getWorkspaceVtexConfigForUser,
  listWorkspacesForOverview,
  type WorkspaceOverviewListItem,
} from "@/backend/models/workspace.model";

export type OverviewActionResult =
  | { ok: true; data: OverviewDTO }
  | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/entrar");
  }
  return session.user.id;
}

async function findOverviewWorkspace(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceOverviewListItem | null> {
  const rows = await listWorkspacesForOverview(userId);
  return rows.find((row) => row.id === workspaceId) ?? null;
}

export async function getWorkspaceOverview(
  workspaceId: string,
): Promise<OverviewActionResult> {
  const userId = await requireUserId();
  const workspace = await findOverviewWorkspace(userId, workspaceId);
  if (!workspace) {
    return { ok: false, error: "Loja não encontrada." };
  }

  const period = lastNDaysPeriod(30);
  const clarityPeriodNote = "Clarity: últimos 3 dias (limite da API)";

  const measurementSources: MeasurementSource[] = [];
  if (isGa4Configured(workspace)) {
    measurementSources.push("analytics");
  }
  if (isGscConfigured(workspace)) {
    measurementSources.push("search-console");
  }
  if (isClarityConfigured(workspace)) {
    measurementSources.push("clarity");
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
        period: { start: period.start, end: period.end },
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
        workspaceId,
        period: { start: period.start, end: period.end },
        sources: measurementSources.length
          ? measurementSources
          : defaultMeasurementSources(),
        gaPropertyId: workspace.gaPropertyId ?? undefined,
      });
    } catch (error) {
      measurementResult = {
        collectedAt: new Date().toISOString(),
        analytics: null,
        searchConsole: null,
        clarity: null,
        sourceResults: measurementSources.map((source) => ({
          source,
          status: "failed" as const,
          error:
            error instanceof Error
              ? error.message
              : "Falha na coleta de medição.",
        })),
        dataGaps: [],
      };
    }
  })();

  await Promise.all([vtexPromise, measurementPromise]);

  const collectedAt = new Date().toISOString();

  const data = buildOverviewDto({
    workspace,
    periodLabel: period.label,
    clarityPeriodNote,
    vtex: vtexResult,
    vtexError,
    measurement: measurementResult,
    collectedAt,
  });

  return { ok: true, data };
}
