import { beforeEach, describe, expect, it, vi } from "vitest";

import { collectClarityWithCache } from "@/backend/lib/clarity/collect-clarity-cached";

const findClaritySnapshot = vi.fn();
const hasClarityApiFetchOnUtcDay = vi.fn();
const findOkClaritySnapshotForUtcDay = vi.fn();
const findLatestOkClaritySnapshot = vi.fn();
const upsertClaritySnapshot = vi.fn();
const collectClarity = vi.fn();

vi.mock("@/backend/models/workspace-clarity-snapshot.model", () => ({
  findClaritySnapshot: (...args: unknown[]) => findClaritySnapshot(...args),
  hasClarityApiFetchOnUtcDay: (...args: unknown[]) =>
    hasClarityApiFetchOnUtcDay(...args),
  findOkClaritySnapshotForUtcDay: (...args: unknown[]) =>
    findOkClaritySnapshotForUtcDay(...args),
  findLatestOkClaritySnapshot: (...args: unknown[]) =>
    findLatestOkClaritySnapshot(...args),
  upsertClaritySnapshot: (...args: unknown[]) => upsertClaritySnapshot(...args),
}));

vi.mock("@/backend/lib/clarity/clarity-collector", () => ({
  collectClarity: (...args: unknown[]) => collectClarity(...args),
}));

const nowMs = Date.parse("2026-10-04T14:00:00.000Z");
const stalePayload = { sessions: 100, deadClicks: 2, quickBacks: 1 };

describe("collectClarityWithCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasClarityApiFetchOnUtcDay.mockResolvedValue(false);
    findOkClaritySnapshotForUtcDay.mockResolvedValue(null);
    findLatestOkClaritySnapshot.mockResolvedValue(null);
    upsertClaritySnapshot.mockImplementation(async (input) => ({
      ...input,
      id: "snap-1",
      payload: input.payload,
    }));
  });

  it("não chama a API quando há snapshot ok do dia", async () => {
    findClaritySnapshot.mockResolvedValue({
      id: "s1",
      workspaceId: "ws1",
      capturedOn: new Date("2026-10-04T00:00:00.000Z"),
      numOfDays: 3,
      collectedAt: new Date("2026-10-04T10:00:00.000Z"),
      fetchedFromApi: true,
      status: "ok",
      payload: stalePayload,
      error: null,
    });

    const result = await collectClarityWithCache({
      workspaceId: "ws1",
      token: "token",
      period: { start: "2026-10-01", end: "2026-10-04" },
      nowMs,
    });

    expect(collectClarity).not.toHaveBeenCalled();
    expect(result.data).toEqual(stalePayload);
    expect(result.meta?.fromCache).toBe(true);
    expect(result.meta?.stale).toBe(false);
  });

  it("persiste após coleta live", async () => {
    findClaritySnapshot.mockResolvedValue(null);
    collectClarity.mockResolvedValue(stalePayload);

    const result = await collectClarityWithCache({
      workspaceId: "ws1",
      token: "token",
      period: { start: "2026-10-01", end: "2026-10-04" },
      nowMs,
    });

    expect(collectClarity).toHaveBeenCalledOnce();
    expect(upsertClaritySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws1",
        numOfDays: 3,
        fetchedFromApi: true,
        status: "ok",
        payload: stalePayload,
      }),
    );
    expect(result.meta?.fromCache).toBe(false);
  });

  it("retorna stale após 429 sem sobrescrever ok", async () => {
    findClaritySnapshot.mockResolvedValue(null);
    collectClarity.mockRejectedValue(
      new Error("Clarity API falhou (429): Exceeded daily limit"),
    );
    findLatestOkClaritySnapshot.mockResolvedValue({
      id: "old",
      workspaceId: "ws1",
      capturedOn: new Date("2026-10-03T00:00:00.000Z"),
      numOfDays: 3,
      collectedAt: new Date("2026-10-03T08:00:00.000Z"),
      fetchedFromApi: true,
      status: "ok",
      payload: stalePayload,
      error: null,
    });

    const result = await collectClarityWithCache({
      workspaceId: "ws1",
      token: "token",
      period: { start: "2026-10-01", end: "2026-10-04" },
      nowMs,
    });

    expect(result.data).toEqual(stalePayload);
    expect(result.meta?.stale).toBe(true);
    expect(upsertClaritySnapshot).not.toHaveBeenCalled();
  });

  it("reutiliza cache do dia quando cota diária de fetch esgotou", async () => {
    findClaritySnapshot.mockResolvedValue(null);
    hasClarityApiFetchOnUtcDay.mockResolvedValue(true);
    findOkClaritySnapshotForUtcDay.mockResolvedValue({
      id: "today",
      workspaceId: "ws1",
      capturedOn: new Date("2026-10-04T00:00:00.000Z"),
      numOfDays: 3,
      collectedAt: new Date("2026-10-04T09:00:00.000Z"),
      fetchedFromApi: true,
      status: "ok",
      payload: stalePayload,
      error: null,
    });

    const result = await collectClarityWithCache({
      workspaceId: "ws1",
      token: "token",
      period: { start: "2026-10-01", end: "2026-10-04" },
      nowMs,
    });

    expect(collectClarity).not.toHaveBeenCalled();
    expect(result.meta?.fromCache).toBe(true);
  });
});
