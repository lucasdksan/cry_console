import { createSign } from "node:crypto";

import type { GaServiceAccount } from "@/backend/lib/workspace-policy";

export type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const TOKEN_URL = "https://oauth2.googleapis.com/token";

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function createServiceAccountJwt(
  serviceAccount: GaServiceAccount,
  scopes: string[],
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: scopes.join(" "),
    aud: TOKEN_URL,
    exp: nowSeconds + 3600,
    iat: nowSeconds,
  };

  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(claimSet)}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key, "base64url");
  return `${unsigned}.${signature}`;
}

export async function getGoogleAccessToken(
  serviceAccount: GaServiceAccount,
  scopes: string[],
  fetchFn: FetchFn = fetch,
): Promise<string> {
  const assertion = createServiceAccountJwt(serviceAccount, scopes);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetchFn(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Falha ao obter token Google (${response.status}): ${text.slice(0, 200)}`,
    );
  }

  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("Resposta OAuth Google sem access_token.");
  }

  return json.access_token;
}

export const GA4_READONLY_SCOPE =
  "https://www.googleapis.com/auth/analytics.readonly";
export const GSC_READONLY_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly";
