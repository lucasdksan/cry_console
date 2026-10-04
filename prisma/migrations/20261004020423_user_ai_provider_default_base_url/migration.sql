-- AlterTable
ALTER TABLE "UserAiProvider" ADD COLUMN     "baseUrl" TEXT,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;
