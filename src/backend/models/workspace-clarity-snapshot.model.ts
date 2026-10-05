import { prisma } from "@/backend/models/prisma";
import type { ClarityNormalized } from "@/backend/lib/shared/normalized-adapters";
import type {
  WorkspaceClaritySnapshot,
  WorkspaceMetricSourceStatus,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

export type ClaritySnapshotRow = {
  id: string;
  workspaceId: string;
  capturedOn: Date;
  numOfDays: number;
  collectedAt: Date;
  fetchedFromApi: boolean;
  status: WorkspaceMetricSourceStatus;
  payload: ClarityNormalized | null;
  error: string | null;
};

function payloadFromJson(value: unknown): ClarityNormalized | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as ClarityNormalized;
}

function rowFromEntity(row: WorkspaceClaritySnapshot): ClaritySnapshotRow {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    capturedOn: row.capturedOn,
    numOfDays: row.numOfDays,
    collectedAt: row.collectedAt,
    fetchedFromApi: row.fetchedFromApi,
    status: row.status,
    payload: payloadFromJson(row.payloadJson),
    error: row.error,
  };
}

export async function findClaritySnapshot(
  workspaceId: string,
  capturedOn: Date,
  numOfDays: number,
): Promise<ClaritySnapshotRow | null> {
  const row = await prisma.workspaceClaritySnapshot.findUnique({
    where: {
      workspaceId_capturedOn_numOfDays: {
        workspaceId,
        capturedOn,
        numOfDays,
      },
    },
  });
  return row ? rowFromEntity(row) : null;
}

export async function hasClarityApiFetchOnUtcDay(
  workspaceId: string,
  capturedOn: Date,
): Promise<boolean> {
  const row = await prisma.workspaceClaritySnapshot.findFirst({
    where: {
      workspaceId,
      capturedOn,
      fetchedFromApi: true,
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function findOkClaritySnapshotForUtcDay(
  workspaceId: string,
  capturedOn: Date,
): Promise<ClaritySnapshotRow | null> {
  const row = await prisma.workspaceClaritySnapshot.findFirst({
    where: {
      workspaceId,
      capturedOn,
      status: "ok",
    },
    orderBy: { collectedAt: "desc" },
  });
  return row ? rowFromEntity(row) : null;
}

export async function findLatestOkClaritySnapshot(
  workspaceId: string,
): Promise<ClaritySnapshotRow | null> {
  const row = await prisma.workspaceClaritySnapshot.findFirst({
    where: {
      workspaceId,
      status: "ok",
    },
    orderBy: [{ capturedOn: "desc" }, { collectedAt: "desc" }],
  });
  return row ? rowFromEntity(row) : null;
}

export type ClaritySnapshotUpsertInput = {
  workspaceId: string;
  capturedOn: Date;
  numOfDays: number;
  collectedAt: Date;
  fetchedFromApi: boolean;
  status: WorkspaceMetricSourceStatus;
  payload: ClarityNormalized | null;
  error?: string | null;
};

function clarityPayloadJson(
  payload: ClarityNormalized | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (payload === null) {
    return Prisma.DbNull;
  }
  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}

export async function upsertClaritySnapshot(
  input: ClaritySnapshotUpsertInput,
): Promise<ClaritySnapshotRow> {
  const row = await prisma.workspaceClaritySnapshot.upsert({
    where: {
      workspaceId_capturedOn_numOfDays: {
        workspaceId: input.workspaceId,
        capturedOn: input.capturedOn,
        numOfDays: input.numOfDays,
      },
    },
    create: {
      workspaceId: input.workspaceId,
      capturedOn: input.capturedOn,
      numOfDays: input.numOfDays,
      collectedAt: input.collectedAt,
      fetchedFromApi: input.fetchedFromApi,
      status: input.status,
      payloadJson: clarityPayloadJson(input.payload),
      error: input.error ?? null,
    },
    update: {
      collectedAt: input.collectedAt,
      fetchedFromApi: input.fetchedFromApi,
      status: input.status,
      payloadJson: clarityPayloadJson(input.payload),
      error: input.error ?? null,
    },
  });
  return rowFromEntity(row);
}
