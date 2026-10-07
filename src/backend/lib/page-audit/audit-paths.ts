import { PAGE_AUDIT_ROLE_DEFS, type PageAuditRoleId } from "@/backend/lib/page-audit/roles";
import type { PageAuditPathsInput } from "@/backend/lib/page-audit/types";
import { resolveAuditUrl } from "@/backend/lib/page-audit/url";

export type RoleAuditPlanItem = {
  role: PageAuditRoleId;
  path: string;
  auditUrl: string;
};

export function buildRoleAuditPlan(
  siteUrl: string,
  paths: PageAuditPathsInput,
): RoleAuditPlanItem[] {
  const plan: RoleAuditPlanItem[] = [];

  for (const def of PAGE_AUDIT_ROLE_DEFS) {
    if (def.id === "home") {
      const homeRaw = paths.home?.trim();
      const homePath =
        !homeRaw || homeRaw === "/" ? "/" : homeRaw.startsWith("/") ? homeRaw : `/${homeRaw}`;
      plan.push({
        role: "home",
        path: homePath,
        auditUrl: resolveAuditUrl(siteUrl, homePath === "/" ? undefined : homePath),
      });
      continue;
    }
    const raw =
      def.id === "category"
        ? paths.category
        : def.id === "product"
          ? paths.product
          : paths.search;
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    plan.push({
      role: def.id,
      path: trimmed.startsWith("/") ? trimmed : `/${trimmed}`,
      auditUrl: resolveAuditUrl(siteUrl, trimmed),
    });
  }

  return plan;
}
