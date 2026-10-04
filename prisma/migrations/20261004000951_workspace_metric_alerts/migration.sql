-- CreateEnum
CREATE TYPE "WorkspaceMetricPeriodType" AS ENUM ('week', 'month');

-- CreateEnum
CREATE TYPE "WorkspaceMetricKey" AS ENUM ('vtex_revenue', 'vtex_orders', 'ga4_sessions', 'ga4_conversion_pct', 'gsc_clicks');

-- CreateEnum
CREATE TYPE "WorkspaceMetricSourceStatus" AS ENUM ('ok', 'failed', 'missing');

-- CreateTable
CREATE TABLE "WorkspaceMetricTarget" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "metricKey" "WorkspaceMetricKey" NOT NULL,
    "periodType" "WorkspaceMetricPeriodType" NOT NULL,
    "targetValue" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMetricTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMetricSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodType" "WorkspaceMetricPeriodType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "capturedOn" DATE NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "vtexRevenue" DECIMAL(18,4),
    "vtexOrders" INTEGER,
    "ga4Sessions" INTEGER,
    "ga4ConversionPct" DECIMAL(8,4),
    "gscClicks" INTEGER,
    "vtexStatus" "WorkspaceMetricSourceStatus" NOT NULL,
    "ga4Status" "WorkspaceMetricSourceStatus" NOT NULL,
    "gscStatus" "WorkspaceMetricSourceStatus" NOT NULL,
    "vtexError" TEXT,
    "ga4Error" TEXT,
    "gscError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceMetricTarget_workspaceId_idx" ON "WorkspaceMetricTarget"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMetricTarget_workspaceId_metricKey_periodType_key" ON "WorkspaceMetricTarget"("workspaceId", "metricKey", "periodType");

-- CreateIndex
CREATE INDEX "WorkspaceMetricSnapshot_workspaceId_periodType_idx" ON "WorkspaceMetricSnapshot"("workspaceId", "periodType");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMetricSnapshot_workspaceId_periodType_capturedOn_key" ON "WorkspaceMetricSnapshot"("workspaceId", "periodType", "capturedOn");

-- AddForeignKey
ALTER TABLE "WorkspaceMetricTarget" ADD CONSTRAINT "WorkspaceMetricTarget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMetricSnapshot" ADD CONSTRAINT "WorkspaceMetricSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
