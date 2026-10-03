export function toGoogleApiDate(iso: string): string {
  if (iso.length >= 10 && iso[4] === "-" && iso[7] === "-") {
    return iso.slice(0, 10);
  }
  return new Date(iso).toISOString().slice(0, 10);
}

export function daysInclusive(start: string, end: string): number {
  const startMs = Date.parse(`${toGoogleApiDate(start)}T00:00:00.000Z`);
  const endMs = Date.parse(`${toGoogleApiDate(end)}T00:00:00.000Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return 1;
  }
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

/** Clarity live insights aceita no máximo 3 dias por chamada. */
export function clarityNumOfDays(start: string, end: string): "1" | "2" | "3" {
  const days = daysInclusive(start, end);
  if (days <= 1) return "1";
  if (days === 2) return "2";
  return "3";
}
