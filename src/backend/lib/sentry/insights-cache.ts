export const OBSERVABILITY_INSIGHTS_CACHE_TTL_MS = 60_000;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const store = new Map<string, CacheEntry<unknown>>();

export function buildObservabilityInsightsCacheKey(input: {
  workspaceId: string;
  period: string;
  pageFilter: string;
  kind: "bundle";
}): string {
  return `obs-insights:${input.workspaceId}:${input.period}:${input.pageFilter}:${input.kind}`;
}

export function getObservabilityInsightsCached<T>(
  key: string,
  now = Date.now(),
): T | undefined {
  const entry = store.get(key);
  if (!entry) {
    return undefined;
  }
  if (now >= entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setObservabilityInsightsCached<T>(
  key: string,
  value: T,
  ttlMs = OBSERVABILITY_INSIGHTS_CACHE_TTL_MS,
  now = Date.now(),
): void {
  store.set(key, { value, expiresAt: now + ttlMs });
}

export function clearObservabilityInsightsCacheForTests(): void {
  store.clear();
}
