import { describe, expect, it } from "vitest";

import {
  calendarMonthPeriod,
  calendarWeekPeriod,
  spCalendarYmd,
} from "@/backend/lib/workspace/period";

describe("calendarWeekPeriod", () => {
  it("usa semana seg–dom em America/Sao_Paulo", () => {
    const ref = new Date("2026-10-07T15:00:00.000Z");
    const todayYmd = spCalendarYmd(ref);
    const period = calendarWeekPeriod(ref);
    expect(period.totalDays).toBe(7);
    expect(period.start.endsWith("T00:00:00.000-03:00")).toBe(true);
    expect(period.end.endsWith("T23:59:59.999-03:00")).toBe(true);
    expect(period.collectEnd.slice(0, 10)).toBe(todayYmd);
    expect(period.elapsedDays).toBeGreaterThanOrEqual(1);
    expect(period.elapsedDays).toBeLessThanOrEqual(7);
    const startYmd = period.start.slice(0, 10);
    const endYmd = period.end.slice(0, 10);
    expect(todayYmd >= startYmd && todayYmd <= endYmd).toBe(true);
  });
});

describe("calendarMonthPeriod", () => {
  it("usa mês calendário completo", () => {
    const ref = new Date("2026-10-15T12:00:00.000Z");
    const period = calendarMonthPeriod(ref);
    expect(period.start).toBe("2026-10-01T00:00:00.000-03:00");
    expect(period.end).toBe("2026-10-31T23:59:59.999-03:00");
    expect(period.collectEnd).toBe("2026-10-15T23:59:59.999-03:00");
    expect(period.totalDays).toBe(31);
    expect(period.elapsedDays).toBe(15);
  });

  it("no primeiro dia do mês elapsedDays é 1", () => {
    const ref = new Date("2026-10-01T12:00:00.000Z");
    const period = calendarMonthPeriod(ref);
    expect(period.elapsedDays).toBe(1);
    expect(period.collectEnd).toBe("2026-10-01T23:59:59.999-03:00");
  });

  it("no último dia do mês collectEnd coincide com o fim do período", () => {
    const ref = new Date("2026-10-31T12:00:00.000Z");
    const period = calendarMonthPeriod(ref);
    expect(period.collectEnd).toBe(period.end);
  });
});
