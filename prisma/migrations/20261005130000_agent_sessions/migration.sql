-- CreateEnum
CREATE TYPE "AgentChatMode" AS ENUM ('agent', 'plan', 'ask');

-- CreateEnum
CREATE TYPE "AgentMessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "AgentModelSource" AS ENUM ('user_provider', 'platform', 'browser');

-- AlterEnum
ALTER TYPE "AiUsagePurpose" ADD VALUE 'agent';

-- CreateTable
CREATE TABLE "AgentSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "mode" "AgentChatMode" NOT NULL DEFAULT 'agent',
    "title" TEXT NOT NULL DEFAULT 'Nova conversa',
    "lastModelSource" "AgentModelSource",
    "lastProviderKey" TEXT,
    "lastModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "AgentMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "partsJson" JSONB,
    "modelSource" "AgentModelSource",
    "providerKey" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentSession_userId_updatedAt_idx" ON "AgentSession"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "AgentSession_workspaceId_idx" ON "AgentSession"("workspaceId");

-- CreateIndex
CREATE INDEX "AgentMessage_sessionId_createdAt_idx" ON "AgentMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "AgentSession" ADD CONSTRAINT "AgentSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSession" ADD CONSTRAINT "AgentSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMessage" ADD CONSTRAINT "AgentMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AgentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
