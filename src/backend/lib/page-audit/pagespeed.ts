import type { PageSpeedSignals } from "@/backend/lib/page-audit/types";

const PAGESPEED_API_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const DEFAULT_TIMEOUT_MS = 20_000;

function roundMetric(value: number | null, decimals = 1): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function auditNumericValue(
  audits: Record<string, { numericValue?: number }> | undefined,
  id: string,
): number | null {
  const raw = audits?.[id]?.numericValue;
  if (raw == null || typeof raw !== "number" || Number.isNaN(raw)) return null;
  return raw;
}

function extractInpFromCrux(loadingExperience: {
  metrics?: { INTERACTION_TO_NEXT_PAINT?: { percentile?: number } };
}): number | null {
  const percentile = loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT?.percentile;
  if (percentile == null || typeof percentile !== "number" || Number.isNaN(percentile)) {
    return null;
  }
  return percentile;
}

function describeHttpError(status: number): string {
  if (status === 400) return "URL inválida ou requisição malformada";
  if (status === 403) return "Acesso negado à API PageSpeed (verifique PAGESPEED_API_KEY)";
  if (status === 429) return "Cota da API PageSpeed excedida";
  if (status >= 500) return "Erro interno na API PageSpeed";
  return `HTTP ${status}`;
}

export type FetchPageSpeedResult =
  | { ok: true; signals: PageSpeedSignals }
  | { ok: false; error: string };

export async function fetchPageSpeedMobile(
  url: string,
  options?: { apiKey?: string; timeoutMs?: number },
): Promise<FetchPageSpeedResult> {
  const apiKey = options?.apiKey ?? process.env.PAGESPEED_API_KEY ?? "";
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
  });
  if (apiKey.trim()) {
    params.set("key", apiKey.trim());
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${PAGESPEED_API_BASE}?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, error: describeHttpError(res.status) };
    }
    const data = (await res.json()) as {
      lighthouseResult?: {
        audits?: Record<string, { numericValue?: number }>;
        categories?: { performance?: { score?: number } };
      };
      loadingExperience?: {
        metrics?: { INTERACTION_TO_NEXT_PAINT?: { percentile?: number } };
      };
    };

    const audits = data.lighthouseResult?.audits;
    const loadingExperience = data.loadingExperience;
    const lcp = auditNumericValue(audits, "largest-contentful-paint");
    const fcp = auditNumericValue(audits, "first-contentful-paint");
    const cls = auditNumericValue(audits, "cumulative-layout-shift");
    const tbt = auditNumericValue(audits, "total-blocking-time");
    const ttfb = auditNumericValue(audits, "server-response-time");
    const inp =
      extractInpFromCrux(loadingExperience ?? {}) ??
      auditNumericValue(audits, "interaction-to-next-paint");

    const perfRaw = data.lighthouseResult?.categories?.performance?.score;
    const performanceScore =
      perfRaw != null && typeof perfRaw === "number" && !Number.isNaN(perfRaw)
        ? Math.round(perfRaw * 100)
        : null;

    return {
      ok: true,
      signals: {
        performanceScore,
        lcp: roundMetric(lcp),
        fcp: roundMetric(fcp),
        cls: roundMetric(cls, 3),
        tbt: roundMetric(tbt),
        ttfb: roundMetric(ttfb),
        inp: roundMetric(inp),
      },
    };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Timeout na API PageSpeed"
        : err instanceof Error
          ? err.message
          : "Falha na API PageSpeed";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
