-- CreateEnum
CREATE TYPE "ObservabilityPageType" AS ENUM ('home', 'pdp', 'plp');

-- CreateTable
CREATE TABLE "WorkspaceObservability" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "sentryProjectId" TEXT,
    "sentryProjectSlug" TEXT,
    "sentryPublicKey" TEXT,
    "sentryIngestHost" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceObservability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObservabilityPagePattern" (
    "id" TEXT NOT NULL,
    "observabilityId" TEXT NOT NULL,
    "pageType" "ObservabilityPageType" NOT NULL,
    "pathnameGlob" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObservabilityPagePattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceObservability_workspaceId_key" ON "WorkspaceObservability"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceObservability_publicKey_key" ON "WorkspaceObservability"("publicKey");

-- CreateIndex
CREATE INDEX "WorkspaceObservability_publicKey_idx" ON "WorkspaceObservability"("publicKey");

-- CreateIndex
CREATE INDEX "ObservabilityPagePattern_observabilityId_idx" ON "ObservabilityPagePattern"("observabilityId");

-- AddForeignKey
ALTER TABLE "WorkspaceObservability" ADD CONSTRAINT "WorkspaceObservability_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservabilityPagePattern" ADD CONSTRAINT "ObservabilityPagePattern_observabilityId_fkey" FOREIGN KEY ("observabilityId") REFERENCES "WorkspaceObservability"("id") ON DELETE CASCADE ON UPDATE CASCADE;
