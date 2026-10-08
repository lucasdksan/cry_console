import { z } from "zod";

import { generateTextWithPlatformGemini } from "@/backend/lib/ai/generate";
import { sentryApiGet, sentryApiPost } from "@/backend/lib/sentry/client";
import { parseSentryServerConfig } from "@/backend/lib/sentry/config";
import { SentryApiError } from "@/backend/lib/sentry/errors";
import {
  getObservabilityInsightsCached,
  setObservabilityInsightsCached,
} from "@/backend/lib/sentry/insights-cache";
import {
  combineIssueAnalysis,
  parseSeerAutofix,
  parseSeerSummary,
  proseNeedsPortuguese,
  type IssueAnalysisView,
} from "@/backend/lib/sentry/issue-diagnosis";

const HIT_TTL_MS = 15 * 60 * 1000;
const MISS_TTL_MS = 2 * 60 * 1000;
const SEER_DISABLED_MS = 60 * 60 * 1000;

const EMPTY_AUTOFIX = {
  rootCause: null,
  solutionSummary: null,
  steps: [],
} as const;

let seerDisabledUntil = 0;

export function clearIssueAnalysisStateForTests(): void {
  seerDisabledUntil = 0;
}

export async function loadIssueAnalysesForProject(input: {
  workspaceId: string;
  projectSlug: string;
  issueIds: string[];
}): Promise<Record<string, IssueAnalysisView>> {
  const { orgSlug } = parseSentryServerConfig();
  const uniqueIds = [...new Set(input.issueIds)];
  const entries = await Promise.all(
    uniqueIds.map(async (issueId) => {
      const view = await loadOne({
        workspaceId: input.workspaceId,
        orgSlug,
        projectSlug: input.projectSlug,
        issueId,
      });
      return [issueId, view] as const;
    }),
  );

  const result: Record<string, IssueAnalysisView> = {};
  for (const [issueId, view] of entries) {
    if (view) {
      result[issueId] = view;
    }
  }
  return result;
}

async function loadOne(input: {
  workspaceId: string;
  orgSlug: string;
  projectSlug: string;
  issueId: string;
}): Promise<IssueAnalysisView | null> {
  const cacheKey = `obs-issue-analysis:${input.workspaceId}:${input.issueId}`;
  const cached = getObservabilityInsightsCached<IssueAnalysisView | null>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const allowed = await issueBelongsToProject(
    input.orgSlug,
    input.projectSlug,
    input.issueId,
  );
  if (!allowed) {
    setObservabilityInsightsCached(cacheKey, null, MISS_TTL_MS);
    return null;
  }

  if (Date.now() < seerDisabledUntil) {
    return null;
  }

  const [summaryResult, autofix] = await Promise.all([
    fetchSummary(input.orgSlug, input.issueId),
    fetchAutofix(input.orgSlug, input.issueId),
  ]);

  if (summaryResult === "disabled") {
    seerDisabledUntil = Date.now() + SEER_DISABLED_MS;
  }

  const summary = summaryResult === "disabled" ? null : summaryResult;
  const combined = combineIssueAnalysis(summary, autofix);
  const view = combined ? await localizeIssueAnalysis(combined) : null;
  setObservabilityInsightsCached(
    cacheKey,
    view,
    view ? HIT_TTL_MS : MISS_TTL_MS,
  );
  return view;
}

const translatedAnalysisSchema = z.object({
  whatHappened: z.string().nullable().optional(),
  possibleCause: z.string().nullable().optional(),
  suggestion: z.string().nullable().optional(),
  steps: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string().optional().default(""),
      }),
    )
    .optional(),
});

async function localizeIssueAnalysis(
  view: IssueAnalysisView,
): Promise<IssueAnalysisView | null> {
  if (!viewNeedsTranslation(view)) {
    return view;
  }

  try {
    const raw = await generateTextWithPlatformGemini(translationPrompt(view));
    const parsed = translatedAnalysisSchema.parse(extractJsonObject(raw));
    const localized: IssueAnalysisView = {
      whatHappened: blankToNull(parsed.whatHappened),
      possibleCause: blankToNull(parsed.possibleCause),
      suggestion: blankToNull(parsed.suggestion),
      steps: (parsed.steps ?? [])
        .slice(0, 5)
        .map((step) => ({
          title: step.title.trim(),
          detail: step.detail.trim(),
        }))
        .filter((step) => step.title || step.detail),
    };
    if (
      !localized.whatHappened &&
      !localized.possibleCause &&
      !localized.suggestion &&
      localized.steps.length === 0
    ) {
      return null;
    }
    if (viewNeedsTranslation(localized)) {
      return null;
    }
    return localized;
  } catch {
    return null;
  }
}

function viewNeedsTranslation(view: IssueAnalysisView): boolean {
  return [
    view.whatHappened,
    view.possibleCause,
    view.suggestion,
    ...view.steps.flatMap((step) => [step.title, step.detail]),
  ].some((text) => typeof text === "string" && proseNeedsPortuguese(text));
}

function translationPrompt(view: IssueAnalysisView): string {
  return `Traduza o JSON abaixo para português do Brasil, para quem opera uma loja virtual.

Regras:
- Responda somente com JSON válido, sem markdown.
- Mantenha as mesmas chaves: whatHappened, possibleCause, suggestion, steps (title e detail).
- Não invente causa nem passo que não esteja no texto.
- Mantenha nomes de função, arquivo, variável e trechos de código como estão.
- Se um campo for null, devolva null.

${JSON.stringify(view)}`;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Resposta sem JSON.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function issueBelongsToProject(
  orgSlug: string,
  projectSlug: string,
  issueId: string,
): Promise<boolean> {
  try {
    const issue = await sentryApiGet<{ project?: { slug?: string } }>(
      `/organizations/${orgSlug}/issues/${issueId}/`,
      undefined,
      { timeoutMs: 4000 },
    );
    return issue?.project?.slug === projectSlug;
  } catch {
    return false;
  }
}

async function fetchSummary(
  orgSlug: string,
  issueId: string,
): Promise<ReturnType<typeof parseSeerSummary> | "disabled"> {
  try {
    const raw = await sentryApiPost<unknown>(
      `/organizations/${orgSlug}/issues/${issueId}/summarize/`,
      {},
      { timeoutMs: 8000 },
    );
    return parseSeerSummary(raw);
  } catch (error) {
    if (
      error instanceof SentryApiError &&
      (error.status === 403 || error.status === 404)
    ) {
      return "disabled";
    }
    return null;
  }
}

async function fetchAutofix(orgSlug: string, issueId: string) {
  try {
    // GET apenas: POST em /autofix/ inicia uma correção automática no Sentry.
    const raw = await sentryApiGet<unknown>(
      `/organizations/${orgSlug}/issues/${issueId}/autofix/`,
      undefined,
      { timeoutMs: 4000 },
    );
    return parseSeerAutofix(raw);
  } catch {
    return { ...EMPTY_AUTOFIX, steps: [] as IssueAnalysisView["steps"] };
  }
}
