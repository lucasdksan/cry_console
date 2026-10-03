import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

function createPrismaClient() {
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function isStalePrismaClient(client: PrismaClient | undefined): boolean {
  return Boolean(client && !("workspace" in client));
}

function resolvePrismaClient(): PrismaClient {
  let candidate = globalForPrisma.prisma;

  if (isStalePrismaClient(candidate)) {
    candidate = undefined;
    globalForPrisma.prisma = undefined;
  }

  if (!candidate) {
    candidate = createPrismaClient();
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = candidate;
  }

  return candidate;
}

export const prisma = resolvePrismaClient();
