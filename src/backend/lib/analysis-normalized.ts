import type {
  AnalyticsNormalized,
  ClarityNormalized,
  SearchConsoleNormalized,
} from "@/backend/lib/normalized-adapters";
import type { MeasurementCollectResult } from "@/backend/lib/measurement/schemas";

export function analyticsFromMeasurement(
  result: MeasurementCollectResult | null,
): AnalyticsNormalized | null {
  if (!result?.analytics || typeof result.analytics !== "object") {
    return null;
  }
  return result.analytics as AnalyticsNormalized;
}

export function searchConsoleFromMeasurement(
  result: MeasurementCollectResult | null,
): SearchConsoleNormalized | null {
  if (!result?.searchConsole || typeof result.searchConsole !== "object") {
    return null;
  }
  return result.searchConsole as SearchConsoleNormalized;
}

export function clarityFromMeasurement(
  result: MeasurementCollectResult | null,
): ClarityNormalized | null {
  if (!result?.clarity || typeof result.clarity !== "object") {
    return null;
  }
  return result.clarity as ClarityNormalized;
}
