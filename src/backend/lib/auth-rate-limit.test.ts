import { describe, expect, it, beforeEach } from "vitest";

import {
  AUTH_RATE_LIMIT,
  AUTH_WINDOW_MS,
  checkAuthRateLimit,
  getClientIp,
  resetAuthRateLimitBuckets,
} from "@/backend/lib/auth-rate-limit";

describe("getClientIp", () => {
  it("prioriza x-forwarded-for", () => {
    const ip = getClientIp({
      headers: new Headers({
        "x-forwarded-for": "203.0.113.1, 10.0.0.1",
        "x-real-ip": "198.51.100.2",
      }),
    });

    expect(ip).toBe("203.0.113.1");
  });

  it("usa x-real-ip quando não há forwarded-for", () => {
    const ip = getClientIp({
      headers: new Headers({ "x-real-ip": "198.51.100.2" }),
    });

    expect(ip).toBe("198.51.100.2");
  });
});

describe("checkAuthRateLimit", () => {
  beforeEach(() => {
    resetAuthRateLimitBuckets();
  });

  it("permite até o limite configurado", () => {
    const now = 1_700_000_000_000;

    for (let i = 0; i < AUTH_RATE_LIMIT; i += 1) {
      expect(checkAuthRateLimit("203.0.113.5", now)).toBe(true);
    }

    expect(checkAuthRateLimit("203.0.113.5", now)).toBe(false);
  });

  it("reinicia a janela após expirar", () => {
    const start = 1_700_000_000_000;

    for (let i = 0; i < AUTH_RATE_LIMIT; i += 1) {
      checkAuthRateLimit("203.0.113.9", start);
    }

    expect(checkAuthRateLimit("203.0.113.9", start)).toBe(false);
    expect(
      checkAuthRateLimit("203.0.113.9", start + AUTH_WINDOW_MS + 1),
    ).toBe(true);
  });
});
