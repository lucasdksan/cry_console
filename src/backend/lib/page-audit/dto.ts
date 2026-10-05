import { isPageAuditFresh } from "@/backend/lib/page-audit/cache";
import {
  pageAuditNarrativeJsonSchema,
  type PageAuditNarrativeJson,
  type PageAuditReportJson,
  type WorkspacePageAuditDTO,
} from "@/backend/lib/page-audit/types";
import type { WorkspacePageAudit } from "@/generated/prisma/client";

export function parsePageAuditReportJson(value: unknown): PageAuditReportJson {
  return value as PageAuditReportJson;
}

export function parsePageAuditNarrativeJson(value: unknown): PageAuditNarrativeJson | null {
  if (value === null || value === undefined) {
    return null;
  }
  return pageAuditNarrativeJsonSchema.parse(value);
}

export function buildWorkspacePageAuditDto(input: {
  workspaceId: string;
  workspaceName: string;
  siteUrl: string;
  row: WorkspacePageAudit | null;
  requestedUrl: string;
  force: boolean;
  narrativeError?: string;
}): WorkspacePageAuditDTO | null {
  if (!input.row) {
    return null;
  }

  const report = parsePageAuditReportJson(input.row.reportJson);
  let narrative: PageAuditNarrativeJson | null = null;
  if (input.row.narrativeJson) {
    try {
      narrative = parsePageAuditNarrativeJson(input.row.narrativeJson);
    } catch {
      narrative = null;
    }
  }

  const cacheFresh = isPageAuditFresh({
    collectedAt: input.row.collectedAt,
    storedUrl: input.row.url,
    requestedUrl: input.requestedUrl,
    force: input.force,
  });

  return {
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    siteUrl: input.siteUrl,
    url: input.row.url,
    collectedAt: input.row.collectedAt.toISOString(),
    status: input.row.status,
    report,
    narrative,
    aiRoute: input.row.aiRoute,
    narrativeError: input.narrativeError,
    cacheFresh,
  };
}
