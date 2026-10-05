import {
  clarityDailyApiBudgetAllowsFetch,
  clarityNumOfDaysInt,
  clarityUtcCapturedOn,
  isClarityQuotaError,
  isClaritySnapshotFresh,
} from "@/backend/lib/clarity/clarity-cache-policy";
import {
  collectClarity,
  type CollectClarityInput,
  type FetchFn,
} from "@/backend/lib/clarity/clarity-collector";
import type { ClarityNormalized } from "@/backend/lib/shared/normalized-adapters";
import type { MeasurementPeriod } from "@/backend/lib/measurement/schemas";
import {
  findClaritySnapshot,
  findLatestOkClaritySnapshot,
  findOkClaritySnapshotForUtcDay,
  hasClarityApiFetchOnUtcDay,
  upsertClaritySnapshot,
} from "@/backend/models/workspace-clarity-snapshot.model";

export type ClarityCollectMeta = {
  fromCache: boolean;
  stale: boolean;
  collectedAt: Date;
};

export type CollectClarityCachedResult = {
  data: ClarityNormalized | null;
  meta: ClarityCollectMeta | null;
  error: string | null;
};

export type CollectClarityCachedInput = {
  workspaceId: string;
  token: string;
  period: MeasurementPeriod;
  nowMs?: number;
  fetchFn?: FetchFn;
};

function resultFromSnapshot(
  snapshot: {
    payload: ClarityNormalized | null;
    collectedAt: Date;
  },
  meta: ClarityCollectMeta,
): CollectClarityCachedResult {
  return {
    data: snapshot.payload,
    meta,
    error: null,
  };
}

async function serveStaleFallback(
  workspaceId: string,
  numOfDays: number,
  capturedOn: Date,
  reason: string,
): Promise<CollectClarityCachedResult> {
  const sameDay = await findOkClaritySnapshotForUtcDay(workspaceId, capturedOn);
  const fallback = sameDay ?? (await findLatestOkClaritySnapshot(workspaceId));
  if (fallback?.payload) {
    return {
      data: fallback.payload,
      meta: {
        fromCache: true,
        stale: true,
        collectedAt: fallback.collectedAt,
      },
      error: null,
    };
  }
  await upsertClaritySnapshot({
    workspaceId,
    capturedOn,
    numOfDays,
    collectedAt: new Date(),
    fetchedFromApi: false,
    status: "failed",
    payload: null,
    error: reason,
  });
  return {
    data: null,
    meta: null,
    error: reason,
  };
}

export async function collectClarityWithCache(
  input: CollectClarityCachedInput,
): Promise<CollectClarityCachedResult> {
  const nowMs = input.nowMs ?? Date.now();
  const capturedOn = clarityUtcCapturedOn(nowMs);
  const numOfDays = clarityNumOfDaysInt(input.period.start, input.period.end);

  const exact = await findClaritySnapshot(
    input.workspaceId,
    capturedOn,
    numOfDays,
  );
  if (isClaritySnapshotFresh(exact) && exact?.payload) {
    return resultFromSnapshot(exact, {
      fromCache: true,
      stale: false,
      collectedAt: exact.collectedAt,
    });
  }

  const fetchedToday = await hasClarityApiFetchOnUtcDay(
    input.workspaceId,
    capturedOn,
  );
  if (!clarityDailyApiBudgetAllowsFetch(fetchedToday)) {
    const alternate = await findOkClaritySnapshotForUtcDay(
      input.workspaceId,
      capturedOn,
    );
    if (alternate?.payload) {
      return resultFromSnapshot(alternate, {
        fromCache: true,
        stale: alternate.numOfDays !== numOfDays,
        collectedAt: alternate.collectedAt,
      });
    }
    return serveStaleFallback(
      input.workspaceId,
      numOfDays,
      capturedOn,
      "Cota diária de chamadas Clarity já utilizada nesta loja.",
    );
  }

  const collectInput: CollectClarityInput = {
    token: input.token,
    period: input.period,
    fetchFn: input.fetchFn,
  };

  try {
    const data = await collectClarity(collectInput);
    const collectedAt = new Date();
    await upsertClaritySnapshot({
      workspaceId: input.workspaceId,
      capturedOn,
      numOfDays,
      collectedAt,
      fetchedFromApi: true,
      status: "ok",
      payload: data,
      error: null,
    });
    return {
      data,
      meta: {
        fromCache: false,
        stale: false,
        collectedAt,
      },
      error: null,
    };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Falha na coleta Clarity.";

    if (isClarityQuotaError(error)) {
      return serveStaleFallback(
        input.workspaceId,
        numOfDays,
        capturedOn,
        reason,
      );
    }

    await upsertClaritySnapshot({
      workspaceId: input.workspaceId,
      capturedOn,
      numOfDays,
      collectedAt: new Date(),
      fetchedFromApi: true,
      status: "failed",
      payload: null,
      error: reason,
    });

    const fallback = await findLatestOkClaritySnapshot(input.workspaceId);
    if (fallback?.payload) {
      return {
        data: fallback.payload,
        meta: {
          fromCache: true,
          stale: true,
          collectedAt: fallback.collectedAt,
        },
        error: null,
      };
    }

    return {
      data: null,
      meta: null,
      error: reason,
    };
  }
}
