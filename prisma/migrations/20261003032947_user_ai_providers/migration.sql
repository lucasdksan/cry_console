-- CreateTable
CREATE TABLE "UserAiProvider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "defaultModel" TEXT,
    "apiTokenEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAiProvider_pkey" PRIMARY KEY ("id")
);

-- Migrate legacy single-model settings into one custom provider row.
INSERT INTO "UserAiProvider" ("id", "userId", "providerKey", "defaultModel", "apiTokenEnc", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "User"."id",
    'custom',
    "User"."aiModel",
    "User"."aiApiTokenEnc",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
WHERE "User"."aiModel" IS NOT NULL
   OR "User"."aiApiTokenEnc" IS NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "aiApiTokenEnc",
DROP COLUMN "aiModel";

-- CreateIndex
CREATE INDEX "UserAiProvider_userId_idx" ON "UserAiProvider"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAiProvider_userId_providerKey_key" ON "UserAiProvider"("userId", "providerKey");

-- AddForeignKey
ALTER TABLE "UserAiProvider" ADD CONSTRAINT "UserAiProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
