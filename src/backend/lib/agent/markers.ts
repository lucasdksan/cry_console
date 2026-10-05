import type { WorkspaceMetricKey } from "@/generated/prisma/client";

import { isWorkspaceMetricKey } from "@/backend/lib/agent/chart";

const CHART_MARKER_RE = /\[\[chart:([a-z0-9_]+)\]\]/gi;
const PROJECTION_MARKER_RE = /\[\[projection:([a-z0-9_]+)\]\]/gi;
const FUNNEL_MARKER_RE = /\[\[funnel\]\]/gi;
const ACTION_PLAN_MARKER_RE = /\[\[action_plan\]\]/gi;

export type ExtractedAgentMarkers = {
  cleanedText: string;
  chartMetric: WorkspaceMetricKey | null;
  projectionMetric: WorkspaceMetricKey | null;
  funnel: boolean;
  actionPlan: boolean;
};

function stripMarker(
  text: string,
  re: RegExp,
  onMatch: (raw: string) => void,
): string {
  return text
    .replace(re, (_, raw?: string) => {
      if (raw !== undefined) {
        onMatch(raw);
      } else {
        onMatch("");
      }
      return "";
    })
    .trim();
}

export function extractAgentMarkers(text: string): ExtractedAgentMarkers {
  let chartMetric: WorkspaceMetricKey | null = null;
  let projectionMetric: WorkspaceMetricKey | null = null;
  let funnel = false;
  let actionPlan = false;

  let cleaned = text;
  cleaned = stripMarker(cleaned, CHART_MARKER_RE, (raw) => {
    if (isWorkspaceMetricKey(raw)) {
      chartMetric = raw;
    }
  });
  cleaned = stripMarker(cleaned, PROJECTION_MARKER_RE, (raw) => {
    if (isWorkspaceMetricKey(raw)) {
      projectionMetric = raw;
    }
  });
  cleaned = cleaned.replace(FUNNEL_MARKER_RE, () => {
    funnel = true;
    return "";
  });
  cleaned = cleaned.replace(ACTION_PLAN_MARKER_RE, () => {
    actionPlan = true;
    return "";
  });

  return {
    cleanedText: cleaned.trim(),
    chartMetric,
    projectionMetric,
    funnel,
    actionPlan,
  };
}
