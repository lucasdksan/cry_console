import type {
  ObservabilityPageFilter,
  ObservabilityPeriod,
  ParsedObservabilityIssue,
  ParsedObservabilityReplay,
  ParsedVitalsGroup,
  VitalRating,
} from "@/backend/lib/sentry/insights";
import {
  observabilityPageFilterLabel,
  observabilityPeriodLabel,
  vitalsGroupPageLabel,
} from "@/backend/lib/sentry/insights";
import {
  diagnoseObservabilityIssue,
  type IssueAnalysisView,
} from "@/backend/lib/sentry/issue-diagnosis";
import {
  buildReplaySummary,
  buildVitalAdvice,
  buildVitalsGroupSummary,
  observabilitySeverityLabel,
  rateIssueSeverity,
  rateReplaySeverity,
  rateVitalsGroupSeverity,
  vitalRatingToSeverity,
  type ObservabilityAlertSeverity,
} from "@/backend/lib/sentry/insights-severity";

export type { ObservabilityAlertSeverity };

export type ObservabilityIssueAnalysisDTO = IssueAnalysisView;

export const OBSERVABILITY_ISSUE_ANALYSIS_LIMIT = 5;

export type ObservabilityIssueAvisoDTO = {
  id: string;
  title: string;
  summary: string;
  exception: string | null;
  where: string | null;
  codeLine: string | null;
  suggestion: string;
  stackLines: string[];
  userCount: number | null;
  unhandled: boolean;
  severity: ObservabilityAlertSeverity;
  severityLabel: string;
  count: number;
  lastSeen: string;
};

export type ObservabilityVitalMetricDTO = {
  key: ParsedVitalsGroup["vitals"][number]["key"];
  label: string;
  p75: number | null;
  displayValue: string | null;
  rating: VitalRating | null;
  unit: "ms" | "unitless";
  severity: ObservabilityAlertSeverity;
  severityLabel: string;
  advice: string;
};

export type ObservabilityVitalsGroupDTO = {
  pageType: ParsedVitalsGroup["pageType"];
  pageTypeLabel: string;
  transactionCount: number | null;
  severity: ObservabilityAlertSeverity;
  severityLabel: string;
  summary: string;
  vitals: ObservabilityVitalMetricDTO[];
};

export type ObservabilityReplayAvisoDTO = {
  id: string;
  startedAt: string;
  durationMs: number | null;
  browser: string | null;
  urls: string[];
  errorCount: number;
  severity: ObservabilityAlertSeverity;
  severityLabel: string;
  summary: string;
};

export type WorkspaceObservabilityStatus =
  | "ok"
  | "not_provisioned"
  | "not_configured"
  | "error";

export type WorkspaceObservabilityDTO = {
  workspaceId: string;
  period: ObservabilityPeriod;
  periodLabel: string;
  pageFilter: ObservabilityPageFilter;
  pageFilterLabel: string;
  status: WorkspaceObservabilityStatus;
  errorMessage?: string;
  issues: ObservabilityIssueAvisoDTO[];
  vitalsGroups: ObservabilityVitalsGroupDTO[];
  replays: ObservabilityReplayAvisoDTO[];
  fetchedAt: string | null;
};

export function toObservabilityIssueAvisoDto(
  issue: ParsedObservabilityIssue,
): ObservabilityIssueAvisoDTO {
  const severity = rateIssueSeverity({
    level: issue.level,
    count: issue.count,
    lastSeen: issue.lastSeen,
  });
  const diagnosis = diagnoseObservabilityIssue(issue);
  return {
    id: issue.id,
    title: diagnosis.headline,
    summary: diagnosis.whatHappened,
    exception: diagnosis.exception,
    where: diagnosis.where,
    codeLine: diagnosis.codeLine,
    suggestion: diagnosis.suggestion,
    stackLines: diagnosis.stackLines,
    userCount: issue.userCount,
    unhandled: issue.unhandled === true,
    severity,
    severityLabel: observabilitySeverityLabel(severity),
    count: issue.count,
    lastSeen: issue.lastSeen,
  };
}

export function toObservabilityVitalsGroupDto(
  group: ParsedVitalsGroup,
): ObservabilityVitalsGroupDTO {
  const pageTypeLabel = vitalsGroupPageLabel(group.pageType);
  const vitals: ObservabilityVitalMetricDTO[] = group.vitals.map((vital) => {
    const severity = vitalRatingToSeverity(vital.rating);
    return {
      ...vital,
      severity,
      severityLabel: observabilitySeverityLabel(severity),
      advice: buildVitalAdvice({
        label: vital.label,
        rating: vital.rating,
        displayValue: vital.displayValue,
      }),
    };
  });
  const severity = rateVitalsGroupSeverity(vitals);
  return {
    pageType: group.pageType,
    pageTypeLabel,
    transactionCount: group.transactionCount,
    severity,
    severityLabel: observabilitySeverityLabel(severity),
    summary: buildVitalsGroupSummary({
      pageTypeLabel,
      severity,
      vitals: vitals.map((v) => ({ label: v.label, rating: v.rating })),
    }),
    vitals,
  };
}

export function toObservabilityReplayAvisoDto(
  replay: ParsedObservabilityReplay,
): ObservabilityReplayAvisoDTO {
  const severity = rateReplaySeverity(replay.errorCount);
  return {
    id: replay.id,
    startedAt: replay.startedAt,
    durationMs: replay.durationMs,
    browser: replay.browser,
    urls: replay.urls,
    errorCount: replay.errorCount,
    severity,
    severityLabel: observabilitySeverityLabel(severity),
    summary: buildReplaySummary({
      errorCount: replay.errorCount,
      browser: replay.browser,
      url: replay.urls[0] ?? null,
      severity,
    }),
  };
}

export function buildEmptyObservabilityDto(input: {
  workspaceId: string;
  period: ObservabilityPeriod;
  pageFilter: ObservabilityPageFilter;
  status: WorkspaceObservabilityStatus;
  errorMessage?: string;
}): WorkspaceObservabilityDTO {
  return {
    workspaceId: input.workspaceId,
    period: input.period,
    periodLabel: observabilityPeriodLabel(input.period),
    pageFilter: input.pageFilter,
    pageFilterLabel: observabilityPageFilterLabel(input.pageFilter),
    status: input.status,
    errorMessage: input.errorMessage,
    issues: [],
    vitalsGroups: [],
    replays: [],
    fetchedAt: null,
  };
}
