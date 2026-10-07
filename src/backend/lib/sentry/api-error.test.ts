import { describe, expect, it } from "vitest";

import {
  assertSentryTokenCanManageProjects,
  isSentryOrganizationAuthToken,
  messageForSentryApiFailure,
  parseSentryErrorBody,
  SENTRY_PROJECT_PERMISSION_MESSAGE,
} from "@/backend/lib/sentry/api-error";
import { SentryApiError } from "@/backend/lib/sentry/errors";

describe("sentry api-error", () => {
  it("detects Organization Auth Tokens by sntrys_ prefix", () => {
    expect(isSentryOrganizationAuthToken("sntrys_abc")).toBe(true);
    expect(isSentryOrganizationAuthToken("sntryu_abc")).toBe(false);
    expect(isSentryOrganizationAuthToken("deadbeef")).toBe(false);
  });

  it("rejects Organization Auth Tokens before calling the API", () => {
    expect(() =>
      assertSentryTokenCanManageProjects("sntrys_ci-only"),
    ).toThrow(SentryApiError);
    expect(() => assertSentryTokenCanManageProjects("sntrys_ci-only")).toThrow(
      SENTRY_PROJECT_PERMISSION_MESSAGE,
    );
    expect(() =>
      assertSentryTokenCanManageProjects("a1b2c3d4e5f6"),
    ).not.toThrow();
  });

  it("extracts detail from Sentry JSON error bodies", () => {
    expect(
      parseSentryErrorBody(
        '{"detail":"You do not have permission to perform this action."}',
      ),
    ).toBe("You do not have permission to perform this action.");
    expect(parseSentryErrorBody("not-json")).toBe("not-json");
    expect(parseSentryErrorBody("")).toBe("");
  });

  it("maps 403 permission errors to Internal Integration guidance", () => {
    expect(
      messageForSentryApiFailure(
        403,
        '{"detail":"You do not have permission to perform this action."}',
        "deadbeef",
      ),
    ).toBe(SENTRY_PROJECT_PERMISSION_MESSAGE);
  });

  it("keeps non-403 details for other Sentry failures", () => {
    expect(
      messageForSentryApiFailure(404, '{"detail":"Project not found."}', "deadbeef"),
    ).toBe("Project not found.");
    expect(messageForSentryApiFailure(500, "", "deadbeef")).toBe("Sentry HTTP 500");
  });
});
