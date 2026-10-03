import type { NextRequest } from "next/server";

import { handleObservabilityTunnelRequest } from "@/backend/lib/sentry/public-handlers";

type RouteContext = {
  params: Promise<{ publicKey: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const { publicKey } = await context.params;
  return handleObservabilityTunnelRequest(publicKey, req);
}
