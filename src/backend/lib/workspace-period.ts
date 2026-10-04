const SP_TZ = "America/Sao_Paulo";

export type WorkspaceCalendarPeriod = {
  start: string;
  end: string;
  /** Fim efetivo da coleta (nunca no futuro — APIs como GA4 não têm câmbio). */
  collectEnd: string;
  label: string;
  periodStart: Date;
  periodEnd: Date;
  capturedOn: Date;
  totalDays: number;
  elapsedDays: number;
};

function spYmd(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function spWeekdayIndex(ymd: string): number {
  const noon = new Date(`${ymd}T12:00:00.000-03:00`);
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: SP_TZ,
    weekday: "short",
  }).format(noon);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[short] ?? 0;
}

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + delta);
  const dt = new Date(utc);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function daysInclusiveYmd(startYmd: string, endYmd: string): number {
  const [sy, sm, sd] = startYmd.split("-").map(Number);
  const [ey, em, ed] = endYmd.split("-").map(Number);
  const startMs = Date.UTC(sy, sm - 1, sd);
  const endMs = Date.UTC(ey, em - 1, ed);
  if (endMs < startMs) {
    return 1;
  }
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

function lastDayOfMonthYmd(year: number, month: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  const dd = String(lastDay).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function spDayStartIso(ymd: string): string {
  return `${ymd}T00:00:00.000-03:00`;
}

function spDayEndIso(ymd: string): string {
  return `${ymd}T23:59:59.999-03:00`;
}

function capturedOnDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

function buildPeriod(
  startYmd: string,
  endYmd: string,
  todayYmd: string,
  label: string,
): WorkspaceCalendarPeriod {
  const totalDays = daysInclusiveYmd(startYmd, endYmd);
  const elapsedDays = Math.min(
    totalDays,
    Math.max(1, daysInclusiveYmd(startYmd, todayYmd)),
  );

  const collectEndYmd = todayYmd < endYmd ? todayYmd : endYmd;

  return {
    start: spDayStartIso(startYmd),
    end: spDayEndIso(endYmd),
    collectEnd: spDayEndIso(collectEndYmd),
    label,
    periodStart: new Date(spDayStartIso(startYmd)),
    periodEnd: new Date(spDayEndIso(endYmd)),
    capturedOn: capturedOnDate(todayYmd),
    totalDays,
    elapsedDays,
  };
}

export function calendarWeekPeriod(ref: Date = new Date()): WorkspaceCalendarPeriod {
  const todayYmd = spYmd(ref);
  const weekday = spWeekdayIndex(todayYmd);
  const startYmd = addDaysYmd(todayYmd, -weekday);
  const endYmd = addDaysYmd(startYmd, 6);
  return buildPeriod(startYmd, endYmd, todayYmd, "Semana calendário (seg–dom)");
}

export function calendarMonthPeriod(ref: Date = new Date()): WorkspaceCalendarPeriod {
  const todayYmd = spYmd(ref);
  const [yearStr, monthStr] = todayYmd.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const startYmd = `${yearStr}-${monthStr}-01`;
  const endYmd = lastDayOfMonthYmd(year, month);
  return buildPeriod(startYmd, endYmd, todayYmd, "Mês calendário");
}

export function resolveCalendarPeriod(
  periodType: "week" | "month",
  ref: Date = new Date(),
): WorkspaceCalendarPeriod {
  return periodType === "week"
    ? calendarWeekPeriod(ref)
    : calendarMonthPeriod(ref);
}

export { spYmd as spCalendarYmd };

export function ymdFromPeriodIso(iso: string): string {
  return iso.slice(0, 10);
}

export function calendarDayFromYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function enumerateCalendarDaysInclusive(
  startYmd: string,
  endYmd: string,
): string[] {
  const days: string[] = [];
  let cursor = startYmd;
  while (cursor <= endYmd) {
    days.push(cursor);
    cursor = addDaysYmd(cursor, 1);
  }
  return days;
}
