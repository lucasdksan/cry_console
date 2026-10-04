export const AI_MODEL_MAX_LENGTH = 128;
export const AI_TOKEN_MAX_LENGTH = 8192;
export const AI_BASE_URL_MAX_LENGTH = 512;

const PRINTABLE_ASCII = /^[\x21-\x7E]+$/;

export function normalizeAiModelInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > AI_MODEL_MAX_LENGTH) {
    return trimmed.slice(0, AI_MODEL_MAX_LENGTH);
  }
  return trimmed;
}

export function validateAiModelInput(raw: string): {
  value: string | null;
  error?: string;
} {
  if (/[\r\n]/.test(raw)) {
    return { value: null, error: "O identificador do modelo não pode conter quebras de linha." };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null };
  }
  if (trimmed.length > AI_MODEL_MAX_LENGTH) {
    return {
      value: null,
      error: `O identificador do modelo deve ter no máximo ${AI_MODEL_MAX_LENGTH} caracteres.`,
    };
  }
  return { value: trimmed };
}

export function validateAiBaseUrlInput(raw: string): {
  value: string | null;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null };
  }
  if (trimmed.length > AI_BASE_URL_MAX_LENGTH) {
    return {
      value: null,
      error: `A URL base deve ter no máximo ${AI_BASE_URL_MAX_LENGTH} caracteres.`,
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { value: null, error: "Informe uma URL base válida (https://…)." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { value: null, error: "A URL base deve usar http ou https." };
  }
  const normalized = parsed.toString().replace(/\/+$/, "");
  return { value: normalized };
}

export function validateAiTokenInput(raw: string): {
  value?: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }
  if (trimmed.length > AI_TOKEN_MAX_LENGTH) {
    return {
      error: `O token deve ter no máximo ${AI_TOKEN_MAX_LENGTH} caracteres.`,
    };
  }
  if (!PRINTABLE_ASCII.test(trimmed)) {
    return {
      error: "O token deve conter apenas caracteres ASCII imprimíveis.",
    };
  }
  if (/^[\w]+=/.test(trimmed)) {
    return {
      error: "Informe apenas o token, não uma linha de variável de ambiente.",
    };
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return {
      error: "Informe o token sem aspas ao redor.",
    };
  }
  return { value: trimmed };
}
