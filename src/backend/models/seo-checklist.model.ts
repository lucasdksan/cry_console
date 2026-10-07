import { prisma } from "@/backend/models/prisma";
import type { SeoChecklistItemStatus, WorkspaceSeoChecklistItem } from "@/generated/prisma/client";

export async function listWorkspaceSeoChecklistItems(
  workspaceId: string,
): Promise<WorkspaceSeoChecklistItem[]> {
  return prisma.workspaceSeoChecklistItem.findMany({
    where: { workspaceId },
    orderBy: { itemKey: "asc" },
  });
}

export async function upsertWorkspaceSeoChecklistItem(input: {
  workspaceId: string;
  itemKey: string;
  status: SeoChecklistItemStatus;
}): Promise<WorkspaceSeoChecklistItem> {
  return prisma.workspaceSeoChecklistItem.upsert({
    where: {
      workspaceId_itemKey: {
        workspaceId: input.workspaceId,
        itemKey: input.itemKey,
      },
    },
    create: {
      workspaceId: input.workspaceId,
      itemKey: input.itemKey,
      status: input.status,
    },
    update: {
      status: input.status,
    },
  });
}
