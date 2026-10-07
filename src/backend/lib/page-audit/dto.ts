import { mergeChecklistWithCatalog } from "@/backend/lib/page-audit/checklist";
import { isPageAuditFresh } from "@/backend/lib/page-audit/cache";
import { normalizePageSpeedPair } from "@/backend/lib/page-audit/pagespeed-normalize";
import {
  PAGE_AUDIT_ROLE_DEFS,
  PAGE_AUDIT_ROLE_LABELS,
  type PageAuditRoleId,
} from "@/backend/lib/page-audit/roles";
import { buildAuditSetSummary } from "@/backend/lib/page-audit/set-summary";
import {
  pageAuditNarrativeJsonSchema,
  type PageAuditNarrativeJson,
  type PageAuditReportJson,
  type PageAuditRoleReport,
  type WorkspacePageAuditSetDTO,
} from "@/backend/lib/page-audit/types";
import type { WorkspacePageAudit, WorkspaceSeoChecklistItem } from "@/generated/prisma/client";

export function parsePageAuditReportJson(value: unknown): PageAuditReportJson {
  const raw = value as PageAuditReportJson & { pagespeed?: unknown; role?: string };
  return {
    ...raw,
    role: (raw.role ?? "home") as PageAuditReportJson["role"],
    pagespeed: normalizePageSpeedPair(raw.pagespeed),
  };
}

export function parsePageAuditNarrativeJson(value: unknown): PageAuditNarrativeJson | null {
  if (value === null || value === undefined) {
    return null;
  }
  return pageAuditNarrativeJsonSchema.parse(value);
}

function buildRoleReport(input: {
  role: PageAuditRoleId;
  row: WorkspacePageAudit | null;
  requestedUrl: string | null;
  force: boolean;
  narrativeError?: string;
}): PageAuditRoleReport {
  const label = PAGE_AUDIT_ROLE_LABELS[input.role];

  if (!input.row) {
    return {
      role: input.role,
      label,
      url: input.requestedUrl,
      collectedAt: null,
      status: null,
      report: null,
      narrative: null,
      aiRoute: null,
      narrativeError: input.narrativeError,
      cacheFresh: false,
    };
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

  const cacheFresh =
    input.requestedUrl != null &&
    isPageAuditFresh({
      collectedAt: input.row.collectedAt,
      storedUrl: input.row.url,
      requestedUrl: input.requestedUrl,
      force: input.force,
    });

  return {
    role: input.role,
    label,
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

export function buildWorkspacePageAuditSetDto(input: {
  workspaceId: string;
  workspaceName: string;
  siteUrl: string;
  rows: WorkspacePageAudit[];
  checklistRows: WorkspaceSeoChecklistItem[];
  requestedUrlsByRole: Partial<Record<string, string>>;
  force: boolean;
  narrativeErrors?: Partial<Record<string, string>>;
}): WorkspacePageAuditSetDTO {
  const rowByRole = new Map(input.rows.map((r) => [r.role, r]));

  const roles: PageAuditRoleReport[] = PAGE_AUDIT_ROLE_DEFS.map((def) => {
    const row = rowByRole.get(def.id) ?? null;
    const requestedUrl = input.requestedUrlsByRole[def.id] ?? row?.url ?? null;
    return buildRoleReport({
      role: def.id,
      row,
      requestedUrl,
      force: input.force,
      narrativeError: input.narrativeErrors?.[def.id],
    });
  });

  const checklist = mergeChecklistWithCatalog(input.checklistRows);

  return {
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    siteUrl: input.siteUrl,
    roles,
    summary: buildAuditSetSummary(roles),
    checklist,
  };
}
