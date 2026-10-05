-- AlterEnum
ALTER TYPE "AiUsagePurpose" ADD VALUE 'page_audit';

-- CreateTable
CREATE TABLE "WorkspacePageAudit" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "reportJson" JSONB NOT NULL,
    "narrativeJson" JSONB,
    "status" "WorkspaceAnalysisStatus" NOT NULL,
    "aiProviderKey" TEXT,
    "aiModel" TEXT,
    "aiRoute" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspacePageAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePageAudit_workspaceId_key" ON "WorkspacePageAudit"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspacePageAudit_workspaceId_idx" ON "WorkspacePageAudit"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspacePageAudit" ADD CONSTRAINT "WorkspacePageAudit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
