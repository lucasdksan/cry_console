-- CreateTable
CREATE TABLE "WorkspaceMetricDay" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "calendarDay" DATE NOT NULL,
    "vtexRevenue" DECIMAL(18,4),
    "vtexOrders" INTEGER,
    "ga4Sessions" INTEGER,
    "ga4Purchases" INTEGER,
    "gscClicks" INTEGER,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMetricDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceMetricDay_workspaceId_calendarDay_idx" ON "WorkspaceMetricDay"("workspaceId", "calendarDay");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMetricDay_workspaceId_calendarDay_key" ON "WorkspaceMetricDay"("workspaceId", "calendarDay");

-- AddForeignKey
ALTER TABLE "WorkspaceMetricDay" ADD CONSTRAINT "WorkspaceMetricDay_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
