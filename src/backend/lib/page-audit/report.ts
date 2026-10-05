import { buildCroHeuristics } from "@/backend/lib/page-audit/cro";
import { buildSeoAudit } from "@/backend/lib/page-audit/heuristics";
import { buildStoreContextFromMeasurement } from "@/backend/lib/page-audit/store-context";
import type {
  HtmlSignals,
  PageAuditReportJson,
  PageAuditSources,
  PageSpeedSignals,
} from "@/backend/lib/page-audit/types";
import { PAGE_AUDIT_DISCLAIMER } from "@/backend/lib/page-audit/types";
import type { AnalysisMeasurementJson } from "@/backend/lib/analysis/types";

export function buildPageAuditReport(input: {
  url: string;
  collectedAt: Date;
  sources: PageAuditSources;
  html: HtmlSignals | null;
  pagespeed: PageSpeedSignals | null;
  measurement: AnalysisMeasurementJson | null;
}): PageAuditReportJson {
  const storeContext = buildStoreContextFromMeasurement(input.measurement);
  const seo = buildSeoAudit({
    html: input.html,
    pagespeed: input.pagespeed,
    storeContext,
  });
  const cro = buildCroHeuristics({
    html: input.html,
    pagespeed: input.pagespeed,
    seoAudit: seo,
    storeContext,
  });

  return {
    url: input.url,
    collectedAt: input.collectedAt.toISOString(),
    sources: input.sources,
    html: input.html,
    pagespeed: input.pagespeed,
    storeContext,
    seo,
    cro,
    disclaimer: PAGE_AUDIT_DISCLAIMER,
  };
}

export function hasPartialCollectSuccess(sources: PageAuditSources): boolean {
  return sources.html.status === "ok" || sources.pagespeed.status === "ok";
}
