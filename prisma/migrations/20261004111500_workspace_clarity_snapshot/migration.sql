-- CreateTable
CREATE TABLE "WorkspaceClaritySnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "capturedOn" DATE NOT NULL,
    "numOfDays" INTEGER NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "fetchedFromApi" BOOLEAN NOT NULL DEFAULT false,
    "status" "WorkspaceMetricSourceStatus" NOT NULL,
    "payloadJson" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceClaritySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceClaritySnapshot_workspaceId_idx" ON "WorkspaceClaritySnapshot"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceClaritySnapshot_workspaceId_capturedOn_numOfDays_key" ON "WorkspaceClaritySnapshot"("workspaceId", "capturedOn", "numOfDays");

-- AddForeignKey
ALTER TABLE "WorkspaceClaritySnapshot" ADD CONSTRAINT "WorkspaceClaritySnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
