-- CreateEnum
CREATE TYPE "WorkspaceAnalysisStatus" AS ENUM ('measured', 'complete', 'narrative_failed');

-- CreateEnum
CREATE TYPE "AiUsagePurpose" AS ENUM ('analysis');

-- CreateTable
CREATE TABLE "WorkspaceAnalysis" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "overallScore" INTEGER,
    "overallStatus" TEXT NOT NULL,
    "measurementJson" JSONB NOT NULL,
    "narrativeJson" JSONB,
    "status" "WorkspaceAnalysisStatus" NOT NULL,
    "aiProviderKey" TEXT,
    "aiModel" TEXT,
    "aiRoute" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "purpose" "AiUsagePurpose" NOT NULL,
    "route" TEXT NOT NULL,
    "providerKey" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAnalysis_workspaceId_key" ON "WorkspaceAnalysis"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceAnalysis_workspaceId_idx" ON "WorkspaceAnalysis"("workspaceId");

-- CreateIndex
CREATE INDEX "AiUsageLog_userId_idx" ON "AiUsageLog"("userId");

-- CreateIndex
CREATE INDEX "AiUsageLog_workspaceId_idx" ON "AiUsageLog"("workspaceId");

-- CreateIndex
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");

-- AddForeignKey
ALTER TABLE "WorkspaceAnalysis" ADD CONSTRAINT "WorkspaceAnalysis_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
