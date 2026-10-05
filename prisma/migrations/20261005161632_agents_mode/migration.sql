-- DropIndex
DROP INDEX "AgentSession_userId_updatedAt_idx";

-- CreateIndex
CREATE INDEX "AgentSession_userId_updatedAt_idx" ON "AgentSession"("userId", "updatedAt");
