import { SentryApiError } from "@/backend/lib/sentry/errors";

export const SENTRY_PROJECT_PERMISSION_MESSAGE =
  "SENTRY_AUTH_TOKEN não pode criar ou gerenciar projetos no Sentry. Organization Auth Tokens (prefixo sntrys_) só têm o escopo org:ci. Crie uma Internal Integration em Settings → Custom Integrations, com Organization: Read, Team: Read e Project: Admin, e use o token gerado.";

export function isSentryOrganizationAuthToken(token: string): boolean {
  return token.startsWith("sntrys_");
}

export function assertSentryTokenCanManageProjects(token: string): void {
  if (isSentryOrganizationAuthToken(token)) {
    throw new SentryApiError(SENTRY_PROJECT_PERMISSION_MESSAGE, 403, "auth");
  }
}

export function parseSentryErrorBody(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }
  try {
    const json: unknown = JSON.parse(trimmed);
    if (
      json &&
      typeof json === "object" &&
      "detail" in json &&
      typeof json.detail === "string" &&
      json.detail.trim()
    ) {
      return json.detail.trim();
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}

export function messageForSentryApiFailure(
  status: number,
  body: string,
  token: string,
): string {
  if (status === 403 || isSentryOrganizationAuthToken(token)) {
    return SENTRY_PROJECT_PERMISSION_MESSAGE;
  }
  return parseSentryErrorBody(body) || `Sentry HTTP ${status}`;
}
