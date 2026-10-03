import { describe, expect, it } from "vitest";

import { renderBootstrapScript } from "@/backend/lib/sentry/bootstrap-script";

describe("bootstrap-script", () => {
  it("embeds sampling rates and page_type tagging", () => {
    const script = renderBootstrapScript({
      dsn: "https://key@o1.ingest.sentry.io/1",
      tunnel: "https://console.example/api/observability/tunnel/abc",
      patterns: [{ pageType: "home", pathnameGlob: "/" }],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1,
    });
    expect(script).toContain("0.1");
    expect(script).toContain("0.05");
    expect(script).toContain("page_type");
    expect(script).toContain("bundle.tracing.replay.min.js");
  });
});
