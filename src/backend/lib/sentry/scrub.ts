const SENSITIVE_QUERY_KEYS = new Set([
  "email",
  "e-mail",
  "mail",
  "token",
  "access_token",
  "refresh_token",
  "password",
  "passwd",
  "senha",
  "cpf",
  "phone",
  "telefone",
  "celular",
  "secret",
  "api_key",
  "apikey",
]);

export function scrubUrlQuery(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        url.searchParams.set(key, "[Filtered]");
      }
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function scrubEnvelopeBody(body: string): string {
  const sensitive =
    /([?&;])(email|e-mail|mail|token|access_token|refresh_token|password|passwd|senha|cpf|phone|telefone|celular|secret|api_key|apikey)=([^&\s"\\]+)/gi;
  return body.replace(sensitive, "$1$2=[Filtered]");
}
