-- CreateEnum
CREATE TYPE "PageAuditRole" AS ENUM ('home', 'category', 'product', 'search');

-- CreateEnum
CREATE TYPE "SeoChecklistItemStatus" AS ENUM ('pending', 'done', 'not_applicable');

-- AlterTable
ALTER TABLE "WorkspacePageAudit" ADD COLUMN "role" "PageAuditRole";

UPDATE "WorkspacePageAudit" SET "role" = 'home' WHERE "role" IS NULL;

ALTER TABLE "WorkspacePageAudit" ALTER COLUMN "role" SET NOT NULL;

DROP INDEX IF EXISTS "WorkspacePageAudit_workspaceId_key";

CREATE UNIQUE INDEX "WorkspacePageAudit_workspaceId_role_key" ON "WorkspacePageAudit"("workspaceId", "role");

-- CreateTable
CREATE TABLE "WorkspaceSeoChecklistItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "status" "SeoChecklistItemStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSeoChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSeoChecklistItem_workspaceId_itemKey_key" ON "WorkspaceSeoChecklistItem"("workspaceId", "itemKey");

-- CreateIndex
CREATE INDEX "WorkspaceSeoChecklistItem_workspaceId_idx" ON "WorkspaceSeoChecklistItem"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceSeoChecklistItem" ADD CONSTRAINT "WorkspaceSeoChecklistItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
