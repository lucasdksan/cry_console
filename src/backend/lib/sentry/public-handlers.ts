import {
  buildPublicDsn,
  renderBootstrapScript,
} from "@/backend/lib/sentry";
import { checkObservabilityRateLimit } from "@/backend/lib/sentry/rate-limit";
import {
  forwardEnvelopeToSentry,
  parseSentryKeyFromAuthHeader,
  validateTunnelEnvelope,
} from "@/backend/lib/sentry/tunnel";
import { findObservabilityByPublicKey } from "@/backend/models/observability.model";

const SCRIPT_CACHE_SECONDS = 60;

export async function handleObservabilityScriptRequest(
  publicKey: string,
  req: Request,
  appOrigin: string,
): Promise<Response> {
  if (!checkObservabilityRateLimit("script", publicKey, req)) {
    return new Response("Muitas requisições.", { status: 429 });
  }

  const ctx = await findObservabilityByPublicKey(publicKey);
  if (!ctx || ctx.patterns.length === 0) {
    return new Response("// cry-observability: não configurado", {
      status: 404,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }

  const dsn = buildPublicDsn({
    publicKey: ctx.sentryPublicKey,
    ingestHost: ctx.sentryIngestHost,
    projectId: ctx.sentryProjectId,
  });
  const tunnel = `${appOrigin}/api/observability/tunnel/${publicKey}`;

  const script = renderBootstrapScript({
    dsn,
    tunnel,
    patterns: ctx.patterns,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1,
  });

  return new Response(script, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": `public, max-age=${SCRIPT_CACHE_SECONDS}`,
    },
  });
}

export async function handleObservabilityTunnelRequest(
  publicKey: string,
  req: Request,
): Promise<Response> {
  if (!checkObservabilityRateLimit("tunnel", publicKey, req)) {
    return new Response("Muitas requisições.", { status: 429 });
  }

  const ctx = await findObservabilityByPublicKey(publicKey);
  if (!ctx || ctx.patterns.length === 0) {
    return new Response(null, { status: 404 });
  }

  const body = await req.text();
  const sentryAuth = req.headers.get("X-Sentry-Auth");
  const sentryKey = parseSentryKeyFromAuthHeader(sentryAuth);

  if (sentryKey && sentryKey !== ctx.sentryPublicKey) {
    return new Response(null, { status: 403 });
  }

  const reject = validateTunnelEnvelope({
    body,
    sentryKey,
    expectedPublicKey: ctx.sentryPublicKey,
    patterns: ctx.patterns,
  });

  if (reject === "invalid_dsn") {
    return new Response(null, { status: 403 });
  }

  if (reject === "path_not_allowed" || reject === "missing_url") {
    return new Response(null, { status: 204 });
  }

  const upstream = await forwardEnvelopeToSentry(
    ctx.sentryIngestHost,
    ctx.sentryProjectId,
    body,
    sentryAuth,
  );

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ??
        "application/json",
    },
  });
}
