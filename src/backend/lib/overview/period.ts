export type OverviewPeriod = {
  start: string;
  end: string;
  label: string;
};

/** Período inclusivo em UTC (ISO), alinhado aos collectors VTEX/Google. */
export function lastNDaysPeriod(days: number): OverviewPeriod {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: `Últimos ${days} dias`,
  };
}
