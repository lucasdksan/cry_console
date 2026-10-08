import { sentryApiGet } from "@/backend/lib/sentry/client";
import { parseSentryServerConfig } from "@/backend/lib/sentry/config";
import {
  buildIssuesListQuery,
  buildTransactionsDiscoverQuery,
  parseDiscoverVitalsRows,
  parseSentryIssues,
  parseSentryReplays,
  type ObservabilityPageFilter,
  type ObservabilityPeriod,
  sentryStatsPeriod,
  vitalDiscoverFields,
} from "@/backend/lib/sentry/insights";
import { parseSentryLatestEvent } from "@/backend/lib/sentry/issue-diagnosis";
import {
  buildObservabilityInsightsCacheKey,
  getObservabilityInsightsCached,
  setObservabilityInsightsCached,
} from "@/backend/lib/sentry/insights-cache";
import type {
  ParsedObservabilityIssue,
  ParsedObservabilityReplay,
  ParsedVitalsGroup,
} from "@/backend/lib/sentry/insights";

export type ObservabilityInsightsBundle = {
  issues: ParsedObservabilityIssue[];
  vitalsGroups: ParsedVitalsGroup[];
  replays: ParsedObservabilityReplay[];
  fetchedAt: string;
};

type SentryDiscoverResponse = {
  data?: Record<string, unknown>[];
};

type SentryReplaysResponse = {
  data?: Record<string, unknown>[];
};

export async function fetchObservabilityInsightsBundle(input: {
  workspaceId: string;
  projectSlug: string;
  projectId: string;
  period: ObservabilityPeriod;
  pageFilter: ObservabilityPageFilter;
}): Promise<ObservabilityInsightsBundle> {
  const cacheKey = buildObservabilityInsightsCacheKey({
    workspaceId: input.workspaceId,
    period: input.period,
    pageFilter: input.pageFilter,
    kind: "bundle",
  });
  const cached = getObservabilityInsightsCached<ObservabilityInsightsBundle>(
    cacheKey,
  );
  if (cached) {
    return cached;
  }

  const { orgSlug } = parseSentryServerConfig();

  const [issues, vitalsGroups, replays] = await Promise.all([
    fetchProjectIssues({
      orgSlug,
      projectSlug: input.projectSlug,
      period: input.period,
      pageFilter: input.pageFilter,
    }),
    fetchProjectVitals({
      orgSlug,
      projectSlug: input.projectSlug,
      period: input.period,
      pageFilter: input.pageFilter,
    }),
    fetchProjectReplays({
      orgSlug,
      projectId: input.projectId,
      period: input.period,
    }),
  ]);

  const bundle: ObservabilityInsightsBundle = {
    issues,
    vitalsGroups,
    replays,
    fetchedAt: new Date().toISOString(),
  };

  setObservabilityInsightsCached(cacheKey, bundle);
  return bundle;
}

async function fetchProjectIssues(input: {
  orgSlug: string;
  projectSlug: string;
  period: ObservabilityPeriod;
  pageFilter: ObservabilityPageFilter;
}): Promise<ParsedObservabilityIssue[]> {
  const params = new URLSearchParams();
  params.set("query", buildIssuesListQuery(input.pageFilter));
  params.set("statsPeriod", sentryStatsPeriod(input.period));
  params.set("sort", "date");
  params.set("limit", "25");

  const rows = await sentryApiGet<Record<string, unknown>[]>(
    `/projects/${input.orgSlug}/${input.projectSlug}/issues/`,
    params,
  );

  const issues = parseSentryIssues(
    Array.isArray(rows) ? (rows as Parameters<typeof parseSentryIssues>[0]) : [],
    input.orgSlug,
  );
  return enrichIssuesWithLatestEvents(input.orgSlug, issues);
}

const ISSUE_EVENT_DETAIL_LIMIT = 6;

async function enrichIssuesWithLatestEvents(
  orgSlug: string,
  issues: ParsedObservabilityIssue[],
): Promise<ParsedObservabilityIssue[]> {
  const ids = new Set(
    issues.slice(0, ISSUE_EVENT_DETAIL_LIMIT).map((issue) => issue.id),
  );
  if (ids.size === 0) {
    return issues;
  }

  const events = await Promise.all(
    issues
      .filter((issue) => ids.has(issue.id))
      .map(async (issue) => {
        try {
          const raw = await sentryApiGet<unknown>(
            `/organizations/${orgSlug}/issues/${issue.id}/events/latest/`,
            undefined,
            { timeoutMs: 3500 },
          );
          return { id: issue.id, event: parseSentryLatestEvent(raw) };
        } catch {
          return { id: issue.id, event: null };
        }
      }),
  );

  const byId = new Map(
    events
      .filter((entry) => entry.event)
      .map((entry) => [entry.id, entry.event] as const),
  );

  return issues.map((issue) => {
    const event = byId.get(issue.id);
    if (!event) {
      return issue;
    }
    return {
      ...issue,
      exceptionType: event.exceptionType ?? issue.exceptionType,
      exceptionValue: event.exceptionValue ?? issue.exceptionValue,
      pageUrl: event.pageUrl ?? issue.pageUrl,
      culprit: event.culprit ?? issue.culprit,
      filename: event.filename ?? issue.filename,
      functionName: event.functionName ?? issue.functionName,
      unhandled:
        issue.unhandled ??
        (event.handled === null ? null : !event.handled),
      frames: event.frames.length > 0 ? event.frames : issue.frames,
    };
  });
}

async function fetchProjectVitals(input: {
  orgSlug: string;
  projectSlug: string;
  period: ObservabilityPeriod;
  pageFilter: ObservabilityPageFilter;
}): Promise<ParsedVitalsGroup[]> {
  const params = new URLSearchParams();
  params.set("dataset", "metricsEnhanced");
  params.set(
    "query",
    buildTransactionsDiscoverQuery(input.projectSlug, input.pageFilter),
  );
  params.set("statsPeriod", sentryStatsPeriod(input.period));
  params.set("per_page", "50");
  for (const field of vitalDiscoverFields()) {
    params.append("field", field);
  }
  params.append("field", "count()");
  if (input.pageFilter === "all") {
    params.append("field", "tags[page_type]");
  }

  const response = await sentryApiGet<SentryDiscoverResponse>(
    `/organizations/${input.orgSlug}/events/`,
    params,
  );

  const rows = Array.isArray(response?.data) ? response.data : [];
  return parseDiscoverVitalsRows(rows, input.pageFilter);
}

async function fetchProjectReplays(input: {
  orgSlug: string;
  projectId: string;
  period: ObservabilityPeriod;
}): Promise<ParsedObservabilityReplay[]> {
  const params = new URLSearchParams();
  params.append("project", input.projectId);
  params.set("statsPeriod", sentryStatsPeriod(input.period));
  params.set("per_page", "25");

  const response = await sentryApiGet<SentryReplaysResponse>(
    `/organizations/${input.orgSlug}/replays/`,
    params,
  );

  const rows = Array.isArray(response?.data) ? response.data : [];
  return parseSentryReplays(
    rows as Parameters<typeof parseSentryReplays>[0],
    input.orgSlug,
  );
}
