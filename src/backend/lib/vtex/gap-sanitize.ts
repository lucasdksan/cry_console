/** Turn collector errors into client-safe one-liners. */
export function sanitizeCollectorError(
  error: string,
  collector?: string,
): string {
  if (/404.*Not Found/i.test(error) && /logistics|shipment/i.test(error)) {
    return "Coleta VTEX parcial: envios/logística indisponível nesta conta (404)";
  }
  if (/404.*Not Found/i.test(error)) {
    return `Coleta VTEX parcial: endpoint ${collector ?? "desconhecido"} indisponível (404)`;
  }
  if (/Traceback|HTTPError|fetch failed|AbortError/i.test(error)) {
    const httpMatch = error.match(/(\d{3})\s+/);
    if (httpMatch) {
      return `Coleta VTEX parcial: recurso indisponível (${httpMatch[1]})`;
    }
    return `Coleta VTEX parcial: ${collector ?? "coletor"} falhou`;
  }
  if (error.length > 160) {
    return `${error.slice(0, 157)}…`;
  }
  return error;
}
