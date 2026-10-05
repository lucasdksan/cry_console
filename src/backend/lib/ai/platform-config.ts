export const DEFAULT_PLATFORM_GEMINI_MODEL = "gemini-3.8-flash";

export function readPlatformGeminiConfig(): {
  apiKey: string | null;
  model: string;
} {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    null;
  const model =
    process.env.GEMINI_MODEL?.trim() || DEFAULT_PLATFORM_GEMINI_MODEL;
  return { apiKey, model };
}

export function isPlatformGeminiConfigured(): boolean {
  return Boolean(readPlatformGeminiConfig().apiKey);
}
