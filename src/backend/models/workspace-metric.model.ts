import { prisma } from "@/backend/models/prisma";
import type {
  WorkspaceMetricDay,
  WorkspaceMetricKey,
  WorkspaceMetricPeriodType,
  WorkspaceMetricSnapshot,
  WorkspaceMetricSourceStatus,
  WorkspaceMetricTarget,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

export type { WorkspaceMetricKey, WorkspaceMetricPeriodType };

export type MetricTargetRow = {
  metricKey: WorkspaceMetricKey;
  periodType: WorkspaceMetricPeriodType;
  targetValue: number;
  minExpectedValue: number | null;
};

export type MetricSnapshotUpsertInput = {
  workspaceId: string;
  periodType: WorkspaceMetricPeriodType;
  periodStart: Date;
  periodEnd: Date;
  capturedOn: Date;
  collectedAt: Date;
  vtexRevenue: number | null;
  vtexOrders: number | null;
  ga4Sessions: number | null;
  ga4ConversionPct: number | null;
  gscClicks: number | null;
  vtexStatus: WorkspaceMetricSourceStatus;
  ga4Status: WorkspaceMetricSourceStatus;
  gscStatus: WorkspaceMetricSourceStatus;
  vtexError?: string | null;
  ga4Error?: string | null;
  gscError?: string | null;
};

export type MetricSnapshotRow = MetricSnapshotUpsertInput & {
  id: string;
};

export type MetricDayUpsertInput = {
  workspaceId: string;
  calendarDay: Date;
  collectedAt: Date;
  vtexRevenue: number | null;
  vtexOrders: number | null;
  ga4Sessions: number | null;
  ga4Purchases: number | null;
  gscClicks: number | null;
};

export type MetricDayRow = MetricDayUpsertInput & {
  id: string;
};

function toTargetRow(row: WorkspaceMetricTarget): MetricTargetRow {
  return {
    metricKey: row.metricKey,
    periodType: row.periodType,
    targetValue: Number(row.targetValue),
    minExpectedValue:
      row.minExpectedValue !== null ? Number(row.minExpectedValue) : null,
  };
}

function snapshotToRow(row: WorkspaceMetricSnapshot): MetricSnapshotRow {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    periodType: row.periodType,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    capturedOn: row.capturedOn,
    collectedAt: row.collectedAt,
    vtexRevenue: row.vtexRevenue !== null ? Number(row.vtexRevenue) : null,
    vtexOrders: row.vtexOrders,
    ga4Sessions: row.ga4Sessions,
    ga4ConversionPct:
      row.ga4ConversionPct !== null ? Number(row.ga4ConversionPct) : null,
    gscClicks: row.gscClicks,
    vtexStatus: row.vtexStatus,
    ga4Status: row.ga4Status,
    gscStatus: row.gscStatus,
    vtexError: row.vtexError,
    ga4Error: row.ga4Error,
    gscError: row.gscError,
  };
}

export async function assertWorkspaceOwnedByUser(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const row = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
    select: { id: true },
  });
  return Boolean(row);
}

export async function listMetricTargetsForWorkspace(
  workspaceId: string,
): Promise<MetricTargetRow[]> {
  const rows = await prisma.workspaceMetricTarget.findMany({
    where: { workspaceId },
    orderBy: [{ periodType: "asc" }, { metricKey: "asc" }],
  });
  return rows.map(toTargetRow);
}

export async function upsertMetricTarget(
  workspaceId: string,
  metricKey: WorkspaceMetricKey,
  periodType: WorkspaceMetricPeriodType,
  targetValue: number,
  minExpectedValue: number,
): Promise<MetricTargetRow> {
  const row = await prisma.workspaceMetricTarget.upsert({
    where: {
      workspaceId_metricKey_periodType: {
        workspaceId,
        metricKey,
        periodType,
      },
    },
    create: {
      workspaceId,
      metricKey,
      periodType,
      targetValue: new Prisma.Decimal(targetValue),
      minExpectedValue: new Prisma.Decimal(minExpectedValue),
    },
    update: {
      targetValue: new Prisma.Decimal(targetValue),
      minExpectedValue: new Prisma.Decimal(minExpectedValue),
    },
  });
  return toTargetRow(row);
}

export async function deleteMetricTarget(
  workspaceId: string,
  metricKey: WorkspaceMetricKey,
  periodType: WorkspaceMetricPeriodType,
): Promise<void> {
  await prisma.workspaceMetricTarget.deleteMany({
    where: { workspaceId, metricKey, periodType },
  });
}

export async function findMetricSnapshotForDay(
  workspaceId: string,
  periodType: WorkspaceMetricPeriodType,
  capturedOn: Date,
): Promise<MetricSnapshotRow | null> {
  const row = await prisma.workspaceMetricSnapshot.findUnique({
    where: {
      workspaceId_periodType_capturedOn: {
        workspaceId,
        periodType,
        capturedOn,
      },
    },
  });
  return row ? snapshotToRow(row) : null;
}

export async function findLatestMetricSnapshotBeforeDay(
  workspaceId: string,
  periodType: WorkspaceMetricPeriodType,
  beforeCapturedOn: Date,
): Promise<MetricSnapshotRow | null> {
  const row = await prisma.workspaceMetricSnapshot.findFirst({
    where: {
      workspaceId,
      periodType,
      capturedOn: { lt: beforeCapturedOn },
    },
    orderBy: { capturedOn: "desc" },
  });
  return row ? snapshotToRow(row) : null;
}

export async function upsertMetricSnapshot(
  input: MetricSnapshotUpsertInput,
): Promise<MetricSnapshotRow> {
  const row = await prisma.workspaceMetricSnapshot.upsert({
    where: {
      workspaceId_periodType_capturedOn: {
        workspaceId: input.workspaceId,
        periodType: input.periodType,
        capturedOn: input.capturedOn,
      },
    },
    create: {
      workspaceId: input.workspaceId,
      periodType: input.periodType,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      capturedOn: input.capturedOn,
      collectedAt: input.collectedAt,
      vtexRevenue:
        input.vtexRevenue !== null
          ? new Prisma.Decimal(input.vtexRevenue)
          : null,
      vtexOrders: input.vtexOrders,
      ga4Sessions: input.ga4Sessions,
      ga4ConversionPct:
        input.ga4ConversionPct !== null
          ? new Prisma.Decimal(input.ga4ConversionPct)
          : null,
      gscClicks: input.gscClicks,
      vtexStatus: input.vtexStatus,
      ga4Status: input.ga4Status,
      gscStatus: input.gscStatus,
      vtexError: input.vtexError ?? null,
      ga4Error: input.ga4Error ?? null,
      gscError: input.gscError ?? null,
    },
    update: {
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      collectedAt: input.collectedAt,
      vtexRevenue:
        input.vtexRevenue !== null
          ? new Prisma.Decimal(input.vtexRevenue)
          : null,
      vtexOrders: input.vtexOrders,
      ga4Sessions: input.ga4Sessions,
      ga4ConversionPct:
        input.ga4ConversionPct !== null
          ? new Prisma.Decimal(input.ga4ConversionPct)
          : null,
      gscClicks: input.gscClicks,
      vtexStatus: input.vtexStatus,
      ga4Status: input.ga4Status,
      gscStatus: input.gscStatus,
      vtexError: input.vtexError ?? null,
      ga4Error: input.ga4Error ?? null,
      gscError: input.gscError ?? null,
    },
  });
  return snapshotToRow(row);
}

function metricDayToRow(row: WorkspaceMetricDay): MetricDayRow {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    calendarDay: row.calendarDay,
    collectedAt: row.collectedAt,
    vtexRevenue: row.vtexRevenue !== null ? Number(row.vtexRevenue) : null,
    vtexOrders: row.vtexOrders,
    ga4Sessions: row.ga4Sessions,
    ga4Purchases: row.ga4Purchases,
    gscClicks: row.gscClicks,
  };
}

export async function listMetricDaysForRange(
  workspaceId: string,
  startDay: Date,
  endDay: Date,
): Promise<MetricDayRow[]> {
  const rows = await prisma.workspaceMetricDay.findMany({
    where: {
      workspaceId,
      calendarDay: { gte: startDay, lte: endDay },
    },
    orderBy: { calendarDay: "asc" },
  });
  return rows.map(metricDayToRow);
}

export async function countMetricDaysForWorkspace(
  workspaceId: string,
): Promise<number> {
  return prisma.workspaceMetricDay.count({ where: { workspaceId } });
}

export async function upsertMetricDays(
  inputs: MetricDayUpsertInput[],
): Promise<void> {
  if (inputs.length === 0) {
    return;
  }
  await prisma.$transaction(
    inputs.map((input) =>
      prisma.workspaceMetricDay.upsert({
        where: {
          workspaceId_calendarDay: {
            workspaceId: input.workspaceId,
            calendarDay: input.calendarDay,
          },
        },
        create: {
          workspaceId: input.workspaceId,
          calendarDay: input.calendarDay,
          collectedAt: input.collectedAt,
          vtexRevenue:
            input.vtexRevenue !== null
              ? new Prisma.Decimal(input.vtexRevenue)
              : null,
          vtexOrders: input.vtexOrders,
          ga4Sessions: input.ga4Sessions,
          ga4Purchases: input.ga4Purchases,
          gscClicks: input.gscClicks,
        },
        update: {
          collectedAt: input.collectedAt,
          vtexRevenue:
            input.vtexRevenue !== null
              ? new Prisma.Decimal(input.vtexRevenue)
              : null,
          vtexOrders: input.vtexOrders,
          ga4Sessions: input.ga4Sessions,
          ga4Purchases: input.ga4Purchases,
          gscClicks: input.gscClicks,
        },
      }),
    ),
  );
}
