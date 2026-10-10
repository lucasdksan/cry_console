import { z } from "zod";

import type { AnalysisPortfolioJson } from "@/backend/lib/analysis/portfolio/types";
import { PILLARS, type Pillar } from "@/backend/lib/vtex/registry";

export { PILLARS, type Pillar };

export const ANALYSIS_PILLAR_STATUSES = [
  "Excelente",
  "Bom",
  "Regular",
  "Crítico",
  "Indisponível",
] as const;

export type AnalysisPillarStatus = (typeof ANALYSIS_PILLAR_STATUSES)[number];

export const ANALYSIS_ALERT_SEVERITIES = [
  "critico",
  "alerta",
  "atencao",
] as const;

export type AnalysisAlertSeverity = (typeof ANALYSIS_ALERT_SEVERITIES)[number];

export type AnalysisAlert = {
  id: string;
  severity: AnalysisAlertSeverity;
  message: string;
};

export type AnalysisDataGap = {
  source: string;
  reason: string;
  impact: string;
};

export type AnalysisPillarCard = {
  pillar: Pillar;
  title: string;
  available: boolean;
  score?: number;
  status: AnalysisPillarStatus;
  metrics: Record<string, number | string | null>;
  alerts: AnalysisAlert[];
  data_gaps: AnalysisDataGap[];
};

export type AnalysisMeasurementJson = {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  collectedAt: string;
  pillars: AnalysisPillarCard[];
  overallScore: number | null;
  overallStatus: AnalysisPillarStatus | "Indisponível";
  dataGaps: AnalysisDataGap[];
  portfolio?: AnalysisPortfolioJson;
};

export const narrativeActionItemSchema = z.object({
  priority: z.enum(["alta", "media", "baixa"]),
  title: z.string().min(1),
  problem: z.string().min(1),
  action: z.string().min(1),
  action_steps: z.array(z.string().min(1)).min(1).max(6),
  target_metric: z.string().min(1),
  expected_impact: z.string().min(1),
  pillar: z.enum(PILLARS).optional(),
});

export const narrativeInterpretationSchema = z.object({
  summary: z.string().min(1),
  diagnosis: z.string().optional(),
  confidence: z.enum(["alta", "media", "baixa"]),
});

export const narrativePillarSchema = z.object({
  pillar: z.enum(PILLARS),
  interpretation: narrativeInterpretationSchema,
  action_plan: z.array(narrativeActionItemSchema).max(3),
});

export const narrativeExecutiveVerdictSchema = z.object({
  headline: z.string().min(1),
  primary_lever: z.string().min(1),
  expected_outcome_30d: z.string().min(1),
  confidence: z.enum(["alta", "media", "baixa"]),
});

export const analysisNarrativeJsonSchema = z.object({
  pillars: z.array(narrativePillarSchema).length(6),
  executive_verdict: narrativeExecutiveVerdictSchema,
});

export type AnalysisNarrativeJson = z.infer<typeof analysisNarrativeJsonSchema>;

export type WorkspaceAnalysisDTO = {
  workspaceId: string;
  workspaceName: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  collectedAt: string;
  overallScore: number | null;
  overallStatus: string;
  status: "measured" | "complete" | "narrative_failed";
  measurement: AnalysisMeasurementJson;
  narrative: AnalysisNarrativeJson | null;
  aiRoute: string | null;
  narrativeError?: string;
};

export const PILLAR_TITLES: Record<Pillar, string> = {
  aquisicao: "Como as pessoas te encontram",
  comercial: "Como estão as vendas",
  crescimento: "Como você está crescendo",
  estrategica: "Onde concentrar esforço",
  experiencia: "Como é a experiência na loja",
  operacional: "Como está a operação",
};
