import { describe, expect, it } from "vitest";

import { validateTunnelEnvelope } from "@/backend/lib/sentry/tunnel";

const patterns = [{ pageType: "home" as const, pathnameGlob: "/" }];

function sampleEventEnvelope(url: string): string {
  return [
    '{"event_id":"abc"}',
    '{"type":"event"}',
    JSON.stringify({
      request: { url },
    }),
  ].join("\n");
}

describe("tunnel", () => {
  it("rejects foreign sentry key", () => {
    const reject = validateTunnelEnvelope({
      body: sampleEventEnvelope("https://loja.com/?email=x"),
      sentryKey: "wrong-key",
      expectedPublicKey: "expected-key",
      patterns,
    });
    expect(reject).toBe("invalid_dsn");
  });

  it("allows tracked pathname", () => {
    const reject = validateTunnelEnvelope({
      body: sampleEventEnvelope("https://loja.com/"),
      sentryKey: "expected-key",
      expectedPublicKey: "expected-key",
      patterns,
    });
    expect(reject).toBeNull();
  });

  it("blocks pathname outside patterns", () => {
    const reject = validateTunnelEnvelope({
      body: sampleEventEnvelope("https://loja.com/checkout"),
      sentryKey: "expected-key",
      expectedPublicKey: "expected-key",
      patterns,
    });
    expect(reject).toBe("path_not_allowed");
  });
});
