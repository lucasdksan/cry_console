import type { PageAuditRole } from "@/generated/prisma/client";

export const PAGE_AUDIT_ROLE_DEFS = [
  { id: "home" as const, label: "Home", defaultPath: "/" },
  { id: "category" as const, label: "Categoria", defaultPath: null },
  { id: "product" as const, label: "Produto", defaultPath: null },
  { id: "search" as const, label: "Busca", defaultPath: null },
] satisfies ReadonlyArray<{ id: PageAuditRole; label: string; defaultPath: string | null }>;

export type PageAuditRoleId = (typeof PAGE_AUDIT_ROLE_DEFS)[number]["id"];

export const PAGE_AUDIT_ROLE_LABELS: Record<PageAuditRoleId, string> = Object.fromEntries(
  PAGE_AUDIT_ROLE_DEFS.map((d) => [d.id, d.label]),
) as Record<PageAuditRoleId, string>;

export function isPageAuditRole(value: string): value is PageAuditRoleId {
  return PAGE_AUDIT_ROLE_DEFS.some((d) => d.id === value);
}
