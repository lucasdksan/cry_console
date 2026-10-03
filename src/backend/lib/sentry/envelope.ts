export type ParsedEnvelopeDsn = {
  publicKey: string;
  host: string;
  projectId: string;
};

export function parseDsn(dsn: string): ParsedEnvelopeDsn | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    const projectId = url.pathname.replace(/^\//, "");
    if (!publicKey || !host || !projectId) {
      return null;
    }
    return { publicKey, host, projectId };
  } catch {
    return null;
  }
}

export function extractDsnFromEnvelope(body: string): string | null {
  const lines = body.split("\n");
  if (lines.length < 3) {
    return null;
  }
  const itemHeaderLine = lines[1];
  if (!itemHeaderLine) {
    return null;
  }
  try {
    const itemHeader = JSON.parse(itemHeaderLine) as { type?: string };
    if (itemHeader.type !== "event" && itemHeader.type !== "transaction") {
      for (let i = 1; i < lines.length; i += 2) {
        const header = lines[i];
        if (!header) {
          continue;
        }
        const parsed = JSON.parse(header) as { type?: string };
        if (parsed.type === "event" || parsed.type === "transaction") {
          const payload = lines[i + 1];
          if (payload) {
            return extractDsnFromEventPayload(payload);
          }
        }
      }
    }
    const payload = lines[2];
    if (payload) {
      return extractDsnFromEventPayload(payload);
    }
  } catch {
    return null;
  }
  return null;
}

function extractDsnFromEventPayload(payload: string): string | null {
  try {
    const event = JSON.parse(payload) as { sdk?: { settings?: { dsn?: string } } };
    return event.sdk?.settings?.dsn ?? null;
  } catch {
    return null;
  }
}

export function extractRequestUrlFromEnvelope(body: string): string | null {
  const lines = body.split("\n");
  for (let i = 1; i < lines.length; i += 2) {
    const headerLine = lines[i];
    const payloadLine = lines[i + 1];
    if (!headerLine || !payloadLine) {
      continue;
    }
    try {
      const header = JSON.parse(headerLine) as { type?: string };
      if (header.type !== "event" && header.type !== "transaction") {
        continue;
      }
      const event = JSON.parse(payloadLine) as {
        request?: { url?: string };
        transaction?: string;
        contexts?: { trace?: { data?: { url?: string } } };
      };
      if (typeof event.request?.url === "string") {
        return event.request.url;
      }
      if (typeof event.contexts?.trace?.data?.url === "string") {
        return event.contexts.trace.data.url;
      }
      if (
        typeof event.transaction === "string" &&
        (event.transaction.startsWith("http://") ||
          event.transaction.startsWith("https://"))
      ) {
        return event.transaction;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function pathnameFromRequestUrl(url: string): string | null {
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

export type ExpectedProjectDsn = {
  publicKey: string;
  ingestHost: string;
  projectId: string;
};

export function envelopeMatchesProject(
  envelopeBody: string,
  envelopeHeaderDsn: string | null,
  expected: ExpectedProjectDsn,
): boolean {
  const candidates: string[] = [];
  if (envelopeHeaderDsn) {
    candidates.push(envelopeHeaderDsn);
  }
  const fromPayload = extractDsnFromEnvelope(envelopeBody);
  if (fromPayload) {
    candidates.push(fromPayload);
  }

  for (const dsn of candidates) {
    const parsed = parseDsn(dsn);
    if (!parsed) {
      continue;
    }
    if (
      parsed.publicKey === expected.publicKey &&
      parsed.host === expected.ingestHost &&
      parsed.projectId === expected.projectId
    ) {
      return true;
    }
  }

  return false;
}

/** Sentry tunnel sends DSN in `X-Sentry-Auth` or query on envelope URL — parse auth header. */
export function parseSentryAuthHeader(value: string | null): ParsedEnvelopeDsn | null {
  if (!value) {
    return null;
  }
  const dsnMatch = /sentry_key=([^,]+)/.exec(value);
  const versionMatch = /sentry_version=(\d+)/.exec(value);
  if (!dsnMatch || !versionMatch) {
    return null;
  }
  return null;
}

export function buildIngestUrl(ingestHost: string, projectId: string): string {
  return `https://${ingestHost}/api/${projectId}/envelope/`;
}
