import { PAGE_AUDIT_CACHE_MS } from "@/backend/lib/page-audit/types";

export function isPageAuditFresh(input: {
  collectedAt: Date;
  storedUrl: string;
  requestedUrl: string;
  force: boolean;
  nowMs?: number;
}): boolean {
  if (input.force) {
    return false;
  }
  if (input.storedUrl !== input.requestedUrl) {
    return false;
  }
  const now = input.nowMs ?? Date.now();
  return now - input.collectedAt.getTime() < PAGE_AUDIT_CACHE_MS;
}
