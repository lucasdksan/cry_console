import { SentryConfigError } from "@/backend/lib/sentry/errors";

export type SentryServerConfig = {
  orgSlug: string;
  teamSlug: string;
  authToken: string;
};

export function isSentryServerConfigured(): boolean {
  try {
    parseSentryServerConfig();
    return true;
  } catch {
    return false;
  }
}

export function parseSentryServerConfig(): SentryServerConfig {
  const orgSlug = process.env.SENTRY_ORG_SLUG?.trim();
  const teamSlug = process.env.SENTRY_TEAM_SLUG?.trim();
  const authToken = process.env.SENTRY_AUTH_TOKEN?.trim();

  if (!orgSlug || !teamSlug || !authToken) {
    throw new SentryConfigError(
      "SENTRY_ORG_SLUG, SENTRY_TEAM_SLUG e SENTRY_AUTH_TOKEN devem estar configurados.",
    );
  }

  return { orgSlug, teamSlug, authToken };
}

export function sentryProjectSlugForWorkspace(workspaceId: string): string {
  const normalized = workspaceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
  return `cry-${normalized}`.toLowerCase();
}
