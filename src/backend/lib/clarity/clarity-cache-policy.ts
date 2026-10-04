import { clarityNumOfDays } from "@/backend/lib/google/period";
import type { WorkspaceMetricSourceStatus } from "@/generated/prisma/client";

export type ClarityNumOfDays = 1 | 2 | 3;

export function clarityUtcCapturedOn(nowMs: number): Date {
  const d = new Date(nowMs);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export function clarityNumOfDaysInt(start: string, end: string): ClarityNumOfDays {
  return Number(clarityNumOfDays(start, end)) as ClarityNumOfDays;
}

export function isClaritySnapshotFresh(
  snapshot: { status: WorkspaceMetricSourceStatus } | null,
): boolean {
  return snapshot?.status === "ok";
}

/** Máximo de uma chamada live à API por loja por dia UTC (cota Clarity: 10/dia). */
export function clarityDailyApiBudgetAllowsFetch(
  alreadyFetchedFromApiToday: boolean,
): boolean {
  return !alreadyFetchedFromApiToday;
}

export function isClarityQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("(429)") || /exceeded daily limit/i.test(message);
}

export function formatClarityCacheNote(meta: {
  fromCache: boolean;
  stale: boolean;
  collectedAt: Date;
}): string | null {
  if (!meta.fromCache && !meta.stale) {
    return null;
  }
  const dateLabel = meta.collectedAt.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
  if (meta.stale) {
    return `Clarity: dados em cache de ${dateLabel} (cota diária da API).`;
  }
  return "Clarity: cache de hoje (cota 10 req/dia por projeto).";
}
