import { getClientIp } from "@/backend/lib/auth-rate-limit";

export const OBSERVABILITY_TUNNEL_LIMIT = 120;
export const OBSERVABILITY_TUNNEL_WINDOW_MS = 60_000;
export const OBSERVABILITY_SCRIPT_LIMIT = 60;
export const OBSERVABILITY_SCRIPT_WINDOW_MS = 60_000;

type RateBucket = { count: number; resetAt: number };

const buckets = new Map<string, RateBucket>();

export function checkObservabilityRateLimit(
  scope: "tunnel" | "script",
  publicKey: string,
  req: Pick<Request, "headers">,
  now = Date.now(),
): boolean {
  const limit =
    scope === "tunnel" ? OBSERVABILITY_TUNNEL_LIMIT : OBSERVABILITY_SCRIPT_LIMIT;
  const windowMs =
    scope === "tunnel"
      ? OBSERVABILITY_TUNNEL_WINDOW_MS
      : OBSERVABILITY_SCRIPT_WINDOW_MS;
  const ip = getClientIp(req);
  const key = `obs:${scope}:${publicKey}:${ip}`;
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}
