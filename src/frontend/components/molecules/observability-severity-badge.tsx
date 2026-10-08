import type { ObservabilityAlertSeverity } from "@/backend/lib/sentry/observability-dto";
import { Badge } from "@/frontend/components/ui/badge";

type ObservabilitySeverityBadgeProps = {
  severity: ObservabilityAlertSeverity;
  label: string;
};

function variantForSeverity(
  severity: ObservabilityAlertSeverity,
): "destructive" | "outline" | "secondary" {
  if (severity === "critico") {
    return "destructive";
  }
  if (severity === "alerta") {
    return "outline";
  }
  return "secondary";
}

export function ObservabilitySeverityBadge({
  severity,
  label,
}: ObservabilitySeverityBadgeProps) {
  return <Badge variant={variantForSeverity(severity)}>{label}</Badge>;
}
