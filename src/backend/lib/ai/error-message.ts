export type HumanizedAiError = {
  message: string;
  retryable: boolean;
  httpStatus?: number;
};

type ApiErrorShape = {
  error?: {
    code?: number | string;
    message?: string;
    status?: string;
  };
  message?: string;
};

function tryParseJson(text: string): ApiErrorShape | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as ApiErrorShape;
  } catch {
    return null;
  }
}

function extractFromShape(
  shape: ApiErrorShape,
  httpStatus?: number,
): { rawMessage: string; code?: number; status?: string } {
  const err = shape.error;
  const rawMessage =
    err?.message?.trim() ||
    shape.message?.trim() ||
    "Falha na API de IA.";
  let code: number | undefined;
  if (typeof err?.code === "number") {
    code = err.code;
  } else if (typeof err?.code === "string" && /^\d+$/.test(err.code)) {
    code = Number(err.code);
  }
  return {
    rawMessage,
    code: code ?? httpStatus,
    status: err?.status,
  };
}

/** Normaliza corpo HTTP ou mensagem bruta (ex.: JSON jogado pelo SDK). */
export function humanizeAiErrorInput(input: {
  raw: string;
  httpStatus?: number;
}): HumanizedAiError {
  const json = tryParseJson(input.raw);
  const nested =
    json ??
    (input.raw.includes('"error"')
      ? tryParseJson(input.raw.slice(input.raw.indexOf("{")))
      : null);

  const { rawMessage, code, status } = nested
    ? extractFromShape(nested, input.httpStatus)
    : { rawMessage: input.raw.trim(), code: input.httpStatus, status: undefined };

  const statusUpper = status?.toUpperCase();
  const lower = rawMessage.toLowerCase();
  const http = code ?? input.httpStatus;

  if (
    http === 503 ||
    statusUpper === "UNAVAILABLE" ||
    lower.includes("high demand") ||
    lower.includes("experiencing high demand")
  ) {
    return {
      message:
        "O modelo está sob alta demanda no momento e não respondeu (503). Isso costuma durar poucos minutos. Aguarde, tente de novo ou escolha outro modelo no seletor acima.",
      retryable: true,
      httpStatus: http ?? 503,
    };
  }

  if (
    http === 429 ||
    statusUpper === "RESOURCE_EXHAUSTED" ||
    lower.includes("rate limit") ||
    lower.includes("quota")
  ) {
    return {
      message:
        "Limite de uso ou taxa da API atingido (429). Aguarde um pouco e tente novamente, ou use outro provedor/modelo.",
      retryable: true,
      httpStatus: http ?? 429,
    };
  }

  if (http === 502 || http === 504) {
    return {
      message:
        "A API de IA respondeu com erro temporário de gateway. Tente novamente em instantes.",
      retryable: true,
      httpStatus: http,
    };
  }

  if (http === 401 || http === 403) {
    return {
      message:
        "Credenciais ou permissão recusada pela API de IA. Verifique o token do provedor nas configurações.",
      retryable: false,
      httpStatus: http,
    };
  }

  if (nested && rawMessage.length > 0 && rawMessage.length < 400) {
    return {
      message: rawMessage,
      retryable: false,
      httpStatus: http,
    };
  }

  return {
    message: "Não foi possível gerar resposta com o modelo selecionado.",
    retryable: false,
    httpStatus: http,
  };
}
