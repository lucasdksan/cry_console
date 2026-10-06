-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkspaceMetricKey" ADD VALUE 'clarity_sessions';
ALTER TYPE "WorkspaceMetricKey" ADD VALUE 'clarity_dead_clicks';
ALTER TYPE "WorkspaceMetricKey" ADD VALUE 'clarity_quick_backs';
