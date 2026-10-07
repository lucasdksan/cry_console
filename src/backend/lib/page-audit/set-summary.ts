import type { PageAuditRoleReport, WorkspacePageAuditSetDTO } from "@/backend/lib/page-audit/types";

function averageNullable(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function buildAuditSetSummary(roles: PageAuditRoleReport[]): WorkspacePageAuditSetDTO["summary"] {
  const measured = roles.filter((r) => r.report != null);
  return {
    seoHealthScore: averageNullable(measured.map((r) => r.report?.seo.healthScore ?? null)),
    croExperienceScore: averageNullable(
      measured.map((r) => {
        const exp = r.report?.cro.experienceScore;
        if (exp == null) return null;
        return Math.round(((exp + 1) / 2) * 100);
      }),
    ),
  };
}
