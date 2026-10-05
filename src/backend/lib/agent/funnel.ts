import type { AnalysisMeasurementJson } from "@/backend/lib/analysis/types";
import type { AgentWorkspaceCommand } from "@/backend/lib/agent/command";
import type { AgentFunnelPart } from "@/backend/lib/agent/types";

const FUNNEL_METRIC_KEYS = [
  "ga4_funnel_views",
  "ga4_funnel_cart",
  "ga4_funnel_checkout",
  "ga4_funnel_purchase",
] as const;

const FUNNEL_LABELS = [
  "Visualizações",
  "Carrinho",
  "Checkout",
  "Compras",
] as const;

function metricNumber(
  metrics: Record<string, number | string | null>,
  key: string,
): number | null {
  const raw = metrics[key];
  if (typeof raw === "number" && !Number.isNaN(raw)) {
    return raw;
  }
  return null;
}

export function funnelVolumesFromMeasurement(
  measurement: AnalysisMeasurementJson | null,
): number[] | null {
  if (!measurement) {
    return null;
  }
  const experiencia = measurement.pillars.find((p) => p.pillar === "experiencia");
  if (!experiencia?.available) {
    return null;
  }
  const volumes = FUNNEL_METRIC_KEYS.map((key) =>
    metricNumber(experiencia.metrics, key),
  );
  if (volumes.some((v) => v === null)) {
    return null;
  }
  return volumes as number[];
}

export function buildFunnelPartFromMeasurement(
  measurement: AnalysisMeasurementJson | null,
): AgentFunnelPart | null {
  const volumes = funnelVolumesFromMeasurement(measurement);
  if (!volumes) {
    return null;
  }
  return buildFunnelPartFromVolumes(volumes);
}

export function buildFunnelPartFromVolumes(volumes: number[]): AgentFunnelPart {
  const steps = volumes.map((value, index) => ({
    label: FUNNEL_LABELS[index] ?? `Etapa ${index + 1}`,
    value,
  }));

  const transitions: AgentFunnelPart["transitions"] = [];
  for (let i = 0; i < steps.length - 1; i += 1) {
    const from = steps[i]!;
    const to = steps[i + 1]!;
    const passRatePct =
      from.value > 0 ? (to.value / from.value) * 100 : null;
    const dropCount = Math.max(0, from.value - to.value);
    transitions.push({
      fromLabel: from.label,
      toLabel: to.label,
      passRatePct,
      dropCount,
    });
  }

  let bottleneckLabel: string | null = null;
  let minRate = Infinity;
  for (const t of transitions) {
    if (t.passRatePct !== null && t.passRatePct < minRate) {
      minRate = t.passRatePct;
      bottleneckLabel = `${t.fromLabel} → ${t.toLabel}`;
    }
  }

  return {
    type: "funnel",
    steps,
    transitions,
    bottleneckLabel,
  };
}

export function shouldAttachFunnelFromCommand(
  command: AgentWorkspaceCommand | undefined,
  markerFunnel: boolean,
): boolean {
  if (markerFunnel) {
    return true;
  }
  return command?.kind === "funnel";
}
