import type { NextRequest } from "next/server";

export const AUTH_RATE_LIMIT = 40;
export const AUTH_WINDOW_MS = 60_000;

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export function getClientIp(req: Pick<NextRequest, "headers">): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0]?.trim() ?? "unknown";
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function checkAuthRateLimit(ip: string, now = Date.now()): boolean {
  const key = `auth:${ip}`;
  const bucket = rateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return true;
  }

  if (bucket.count >= AUTH_RATE_LIMIT) {
    return false;
  }

  bucket.count += 1;
  return true;
}

/** Limpa buckets em memória — uso exclusivo em testes. */
export function resetAuthRateLimitBuckets() {
  rateBuckets.clear();
}
