-- CreateTable
CREATE TABLE "UserAgentSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "metricKeys" "WorkspaceMetricKey"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAgentSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAgentSkill_userId_idx" ON "UserAgentSkill"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAgentSkill_userId_slug_key" ON "UserAgentSkill"("userId", "slug");

-- AddForeignKey
ALTER TABLE "UserAgentSkill" ADD CONSTRAINT "UserAgentSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
