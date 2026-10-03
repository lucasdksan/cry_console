import { describe, expect, it } from "vitest";

import { clarityNumOfDays, toGoogleApiDate } from "@/backend/lib/google/period";

describe("period helpers", () => {
  it("converte ISO para YYYY-MM-DD", () => {
    expect(toGoogleApiDate("2026-07-01T10:00:00.000Z")).toBe("2026-07-01");
    expect(toGoogleApiDate("2026-07-01")).toBe("2026-07-01");
  });

  it("limita numOfDays do Clarity a 3", () => {
    expect(clarityNumOfDays("2026-07-01", "2026-07-01")).toBe("1");
    expect(clarityNumOfDays("2026-07-01", "2026-07-02")).toBe("2");
    expect(clarityNumOfDays("2026-07-01", "2026-07-31")).toBe("3");
  });
});
