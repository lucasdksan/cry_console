import { buildIngestUrl } from "@/backend/lib/sentry/envelope";
import {
  extractRequestUrlFromEnvelope,
  pathnameFromRequestUrl,
} from "@/backend/lib/sentry/envelope";
import {
  pathnameMatchesAnyPattern,
  type PathPattern,
} from "@/backend/lib/sentry/pathname-glob";
import { scrubEnvelopeBody } from "@/backend/lib/sentry/scrub";

export type TunnelRejectReason =
  | "invalid_dsn"
  | "path_not_allowed"
  | "missing_url";

export type TunnelForwardInput = {
  body: string;
  sentryKey: string | null;
  expectedPublicKey: string;
  patterns: PathPattern[];
};

export function envelopeRequiresPathMatch(body: string): boolean {
  return (
    body.includes('"type":"event"') || body.includes('"type":"transaction"')
  );
}

export function validateTunnelEnvelope(
  input: TunnelForwardInput,
): TunnelRejectReason | null {
  if (input.sentryKey && input.sentryKey !== input.expectedPublicKey) {
    return "invalid_dsn";
  }

  if (!envelopeRequiresPathMatch(input.body)) {
    return null;
  }

  const requestUrl = extractRequestUrlFromEnvelope(input.body);
  if (!requestUrl) {
    return "missing_url";
  }
  const pathname = pathnameFromRequestUrl(requestUrl);
  if (!pathname || !pathnameMatchesAnyPattern(pathname, input.patterns)) {
    return "path_not_allowed";
  }

  return null;
}

export async function forwardEnvelopeToSentry(
  ingestHost: string,
  projectId: string,
  body: string,
  sentryAuth: string | null,
): Promise<Response> {
  const scrubbed = scrubEnvelopeBody(body);
  const url = buildIngestUrl(ingestHost, projectId);
  const headers: Record<string, string> = {
    "Content-Type": "application/x-sentry-envelope",
  };
  if (sentryAuth) {
    headers["X-Sentry-Auth"] = sentryAuth;
  }
  return fetch(url, {
    method: "POST",
    headers,
    body: scrubbed,
  });
}

export function parseSentryKeyFromAuthHeader(
  authHeader: string | null,
): string | null {
  if (!authHeader) {
    return null;
  }
  const match = /sentry_key=([^,\s]+)/.exec(authHeader);
  return match?.[1] ?? null;
}
