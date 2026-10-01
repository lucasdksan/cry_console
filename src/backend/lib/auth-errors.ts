const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "Este e-mail já possui senha. Entre com e-mail e senha ou use outro e-mail.",
  CredentialsSignin: "E-mail ou senha inválidos.",
  Default: "Não foi possível concluir a autenticação. Tente novamente.",
};

export function getAuthErrorMessage(code?: string | null) {
  if (!code) {
    return null;
  }

  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.Default;
}
