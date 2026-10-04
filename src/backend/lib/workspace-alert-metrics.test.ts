import { describe, expect, it } from "vitest";

import { isSnapshotCacheFresh } from "@/backend/lib/workspace-alert-metrics";

const okSnapshot = {
  collectedAt: new Date("2026-10-03T22:00:00.000Z"),
  vtexStatus: "ok" as const,
  ga4Status: "ok" as const,
  gscStatus: "ok" as const,
};

describe("isSnapshotCacheFresh", () => {
  it("reusa snapshot ok dentro do TTL", () => {
    expect(
      isSnapshotCacheFresh(okSnapshot, Date.parse("2026-10-03T22:10:00.000Z"), 15 * 60 * 1000),
    ).toBe(true);
  });

  it("não reusa snapshot com fonte falha", () => {
    expect(
      isSnapshotCacheFresh(
        { ...okSnapshot, ga4Status: "failed" },
        Date.parse("2026-10-03T22:10:00.000Z"),
        15 * 60 * 1000,
      ),
    ).toBe(false);
  });

  it("não reusa snapshot expirado", () => {
    expect(
      isSnapshotCacheFresh(okSnapshot, Date.parse("2026-10-03T22:20:00.000Z"), 15 * 60 * 1000),
    ).toBe(false);
  });
});
