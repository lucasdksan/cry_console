import { describe, expect, it } from "vitest";

import { lastNDaysPeriod } from "@/backend/lib/overview-period";

describe("overview-period", () => {
  it("retorna label e intervalo ISO de 30 dias", () => {
    const period = lastNDaysPeriod(30);
    expect(period.label).toBe("Últimos 30 dias");
    expect(period.start).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(period.end).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Date.parse(period.end)).toBeGreaterThanOrEqual(Date.parse(period.start));
  });
});
