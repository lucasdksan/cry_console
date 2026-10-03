import type { NextRequest } from "next/server";

import { handleObservabilityScriptRequest } from "@/backend/lib/sentry/public-handlers";

type RouteContext = {
  params: Promise<{ publicKey: string }>;
};

function resolveAppOrigin(req: NextRequest): string {
  const fromEnv = process.env.AUTH_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { publicKey } = await context.params;
  return handleObservabilityScriptRequest(
    publicKey,
    req,
    resolveAppOrigin(req),
  );
}
