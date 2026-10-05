import type {
  AnalysisMeasurementJson,
  AnalysisNarrativeJson,
  WorkspaceAnalysisDTO,
} from "@/backend/lib/analysis/types";
import { analysisNarrativeJsonSchema } from "@/backend/lib/analysis/types";
import type { WorkspaceAnalysis } from "@/generated/prisma/client";

export function parseMeasurementJson(value: unknown): AnalysisMeasurementJson {
  return value as AnalysisMeasurementJson;
}

export function parseNarrativeJson(
  value: unknown,
): AnalysisNarrativeJson | null {
  if (value === null || value === undefined) {
    return null;
  }
  return analysisNarrativeJsonSchema.parse(value);
}

export function buildWorkspaceAnalysisDto(input: {
  workspaceId: string;
  workspaceName: string;
  row: WorkspaceAnalysis;
  narrativeError?: string;
}): WorkspaceAnalysisDTO {
  const measurement = parseMeasurementJson(input.row.measurementJson);
  let narrative: AnalysisNarrativeJson | null = null;
  if (input.row.narrativeJson) {
    try {
      narrative = parseNarrativeJson(input.row.narrativeJson);
    } catch {
      narrative = null;
    }
  }

  return {
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    periodLabel: input.row.periodLabel,
    periodStart: input.row.periodStart.toISOString(),
    periodEnd: input.row.periodEnd.toISOString(),
    collectedAt: input.row.collectedAt.toISOString(),
    overallScore: input.row.overallScore,
    overallStatus: input.row.overallStatus,
    status: input.row.status,
    measurement,
    narrative,
    aiRoute: input.row.aiRoute,
    narrativeError: input.narrativeError,
  };
}
