import { collectClarityWithCache } from "@/backend/lib/clarity/collect-clarity-cached";
import { formatClarityCacheNote } from "@/backend/lib/clarity/clarity-cache-policy";
import { collectClarity } from "@/backend/lib/clarity/clarity-collector";
import { collectGa4Analytics } from "@/backend/lib/google/ga4-collector";
import {
  GA4_READONLY_SCOPE,
  GSC_READONLY_SCOPE,
  getGoogleAccessToken,
  type FetchFn,
} from "@/backend/lib/google/google-auth";
import { collectSearchConsole } from "@/backend/lib/google/gsc-collector";
import { normalizeGscSiteUrl } from "@/backend/lib/google/gsc-site-url";
import type {
  ClarityCollectMetaDto,
  MeasurementCollectResult,
  MeasurementDataGap,
  MeasurementSource,
  MeasurementSourceResult,
} from "@/backend/lib/measurement/schemas";
import { defaultMeasurementSources } from "@/backend/lib/measurement/schemas";
import type { AnalyticsNormalized } from "@/backend/lib/normalized-adapters";
import type { ClarityNormalized } from "@/backend/lib/normalized-adapters";
import type { SearchConsoleNormalized } from "@/backend/lib/normalized-adapters";
import type { GaServiceAccount } from "@/backend/lib/workspace-policy";
import type { MeasurementPeriod } from "@/backend/lib/measurement/schemas";

export type WorkspaceMeasurementSecrets = {
  siteUrl: string;
  gaServiceAccount?: GaServiceAccount;
  clarityToken?: string;
};

export type RunMeasurementCollectOptions = {
  secrets: WorkspaceMeasurementSecrets;
  period: MeasurementPeriod;
  sources?: MeasurementSource[];
  workspaceId?: string;
  gaPropertyId?: string;
  gscSiteUrl?: string;
  brandKeyword?: string;
  fetchFn?: FetchFn;
};

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 200 ? `${message.slice(0, 197)}…` : message;
}

export async function runMeasurementCollect(
  options: RunMeasurementCollectOptions,
): Promise<MeasurementCollectResult> {
  const sources = options.sources ?? defaultMeasurementSources();
  const fetchFn = options.fetchFn ?? fetch;
  const sourceResults: MeasurementSourceResult[] = [];
  const dataGaps: MeasurementDataGap[] = [];

  let analytics: AnalyticsNormalized | null = null;
  let searchConsole: SearchConsoleNormalized | null = null;
  let clarity: ClarityNormalized | null = null;
  let clarityCollectMeta: ClarityCollectMetaDto | undefined;

  const needsGoogle = sources.some(
    (s) => s === "analytics" || s === "search-console",
  );
  let googleToken: string | undefined;

  if (needsGoogle) {
    if (!options.secrets.gaServiceAccount) {
      for (const source of sources.filter(
        (s) => s === "analytics" || s === "search-console",
      )) {
        sourceResults.push({
          source,
          status: "failed",
          error: "Service account do Google não configurada nesta loja.",
        });
        dataGaps.push({
          source,
          reason: "Service account do Google ausente",
          impact: `Dados de ${source} indisponíveis`,
        });
      }
    } else {
      const scopes = [
        ...(sources.includes("analytics") ? [GA4_READONLY_SCOPE] : []),
        ...(sources.includes("search-console") ? [GSC_READONLY_SCOPE] : []),
      ];
      googleToken = await getGoogleAccessToken(
        options.secrets.gaServiceAccount,
        scopes,
        fetchFn,
      );
    }
  }

  await Promise.all(
    sources.map(async (source) => {
      if (sourceResults.some((r) => r.source === source)) {
        return;
      }

      try {
        if (source === "analytics") {
          if (!googleToken) return;
          if (!options.gaPropertyId?.trim()) {
            throw new Error(
              "Informe o GA4 Property ID (ex.: 123456789) para coletar Analytics.",
            );
          }
          analytics = await collectGa4Analytics({
            accessToken: googleToken,
            propertyId: options.gaPropertyId.trim(),
            period: options.period,
            fetchFn,
          });
          sourceResults.push({ source, status: "ok" });
          return;
        }

        if (source === "search-console") {
          if (!googleToken) return;
          const siteUrl =
            options.gscSiteUrl?.trim() ||
            normalizeGscSiteUrl(options.secrets.siteUrl);
          searchConsole = await collectSearchConsole({
            accessToken: googleToken,
            siteUrl,
            period: options.period,
            brandKeyword: options.brandKeyword,
            fetchFn,
          });
          sourceResults.push({ source, status: "ok" });
          return;
        }

        if (source === "clarity") {
          if (!options.secrets.clarityToken?.trim()) {
            throw new Error("Token do Microsoft Clarity não configurado.");
          }
          const token = options.secrets.clarityToken.trim();
          if (options.workspaceId) {
            const cached = await collectClarityWithCache({
              workspaceId: options.workspaceId,
              token,
              period: options.period,
              fetchFn,
            });
            clarity = cached.data;
            if (cached.meta) {
              clarityCollectMeta = {
                fromCache: cached.meta.fromCache,
                stale: cached.meta.stale,
                collectedAt: cached.meta.collectedAt.toISOString(),
              };
              const note = formatClarityCacheNote(cached.meta);
              if (note) {
                dataGaps.push({
                  source: "clarity",
                  reason: note,
                  impact: "Dados Clarity servidos do cache local.",
                });
              }
            }
            if (cached.error && !clarity) {
              throw new Error(cached.error);
            }
          } else {
            clarity = await collectClarity({
              token,
              period: options.period,
              fetchFn,
            });
          }
          sourceResults.push({ source, status: "ok" });
        }
      } catch (error) {
        const reason = sanitizeError(error);
        sourceResults.push({ source, status: "failed", error: reason });
        dataGaps.push({
          source,
          reason,
          impact: `Coleta ${source} incompleta`,
        });
      }
    }),
  );

  return {
    collectedAt: new Date().toISOString(),
    analytics,
    searchConsole,
    clarity,
    clarityCollectMeta,
    sourceResults,
    dataGaps,
  };
}
