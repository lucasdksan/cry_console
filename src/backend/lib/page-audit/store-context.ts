import type { AnalysisMeasurementJson } from "@/backend/lib/analysis/types";
import type { StoreContextBlock } from "@/backend/lib/page-audit/types";

function metricNumber(
  metrics: Record<string, number | string | null>,
  key: string,
): number | null {
  const v = metrics[key];
  if (typeof v === "number" && !Number.isNaN(v)) {
    return v;
  }
  return null;
}

export function buildStoreContextFromMeasurement(
  measurement: AnalysisMeasurementJson | null,
): StoreContextBlock | null {
  if (!measurement) {
    return null;
  }

  const aquisicao = measurement.pillars.find((p) => p.pillar === "aquisicao");
  const experiencia = measurement.pillars.find((p) => p.pillar === "experiencia");

  const gscClicks = aquisicao ? metricNumber(aquisicao.metrics, "gsc_clicks") : null;
  const gscCtrPct = aquisicao ? metricNumber(aquisicao.metrics, "gsc_ctr_pct") : null;
  const gscPosition = aquisicao ? metricNumber(aquisicao.metrics, "gsc_position") : null;
  const funnelCheckoutToPurchasePct = experiencia
    ? metricNumber(experiencia.metrics, "funnel_checkout_to_purchase_pct")
    : null;
  const clarityDeadClickRate = experiencia
    ? metricNumber(experiencia.metrics, "clarity_dead_click_rate_pct")
    : null;

  const hasAny =
    gscClicks !== null ||
    gscCtrPct !== null ||
    gscPosition !== null ||
    funnelCheckoutToPurchasePct !== null ||
    clarityDeadClickRate !== null;

  if (!hasAny) {
    return null;
  }

  return {
    gscClicks,
    gscCtrPct,
    gscPosition,
    funnelCheckoutToPurchasePct,
    clarityDeadClickRate,
  };
}
