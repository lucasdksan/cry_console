import { fetchObservabilityInsightsBundle } from "@/backend/lib/sentry/fetch-insights";
import { SentryApiError } from "@/backend/lib/sentry/errors";
import {
  parseObservabilityPageFilter,
  parseObservabilityPeriod,
} from "@/backend/lib/sentry/insights";
import {
  buildEmptyObservabilityDto,
  toObservabilityIssueAvisoDto,
  toObservabilityReplayAvisoDto,
  toObservabilityVitalsGroupDto,
  type WorkspaceObservabilityDTO,
} from "@/backend/lib/sentry/observability-dto";
import { isSentryServerConfigured } from "@/backend/lib/sentry/config";
import { findObservabilityInsightsContextForUser } from "@/backend/models/observability.model";

/** Leitura server-side (não é Server Action — evita POST na rota da página). */
export async function loadWorkspaceObservability(
  userId: string,
  workspaceId: string,
  periodRaw?: string,
  pageFilterRaw?: string,
): Promise<WorkspaceObservabilityDTO> {
  const period = parseObservabilityPeriod(periodRaw);
  const pageFilter = parseObservabilityPageFilter(pageFilterRaw);

  if (!isSentryServerConfigured()) {
    return buildEmptyObservabilityDto({
      workspaceId,
      period,
      pageFilter,
      status: "not_configured",
      errorMessage:
        "Sentry não está configurado no servidor. Defina SENTRY_ORG_SLUG, SENTRY_TEAM_SLUG e SENTRY_AUTH_TOKEN (Internal Integration com Event: Read).",
    });
  }

  const context = await findObservabilityInsightsContextForUser(
    userId,
    workspaceId,
  );
  if (!context) {
    return buildEmptyObservabilityDto({
      workspaceId,
      period,
      pageFilter,
      status: "not_provisioned",
    });
  }

  try {
    const bundle = await fetchObservabilityInsightsBundle({
      workspaceId,
      projectSlug: context.sentryProjectSlug,
      projectId: context.sentryProjectId,
      period,
      pageFilter,
    });

    return {
      ...buildEmptyObservabilityDto({
        workspaceId,
        period,
        pageFilter,
        status: "ok",
      }),
      issues: bundle.issues.map(toObservabilityIssueAvisoDto),
      vitalsGroups: bundle.vitalsGroups.map(toObservabilityVitalsGroupDto),
      replays: bundle.replays.map(toObservabilityReplayAvisoDto),
      fetchedAt: bundle.fetchedAt,
    };
  } catch (error) {
    const message =
      error instanceof SentryApiError
        ? error.message
        : "Não foi possível carregar dados do Sentry.";
    return buildEmptyObservabilityDto({
      workspaceId,
      period,
      pageFilter,
      status: "error",
      errorMessage: message,
    });
  }
}
