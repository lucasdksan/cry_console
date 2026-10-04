import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Bump when the Prisma schema changes in ways that require a new client instance.
 * Next.js dev keeps `globalThis.prisma` across HMR; an outdated client throws
 * validation errors for fields that exist in the generated client but not in memory.
 */
const PRISMA_CLIENT_CACHE_KEY = "cry-console-prisma-v6-workspace-clarity-snapshot";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaCacheKey?: string;
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
  if (!client) {
    return false;
  }
  if (
    !("workspace" in client) ||
    !("workspaceMetricSnapshot" in client) ||
    !("workspaceClaritySnapshot" in client)
  ) {
    return true;
  }
  return globalForPrisma.prismaCacheKey !== PRISMA_CLIENT_CACHE_KEY;
}

async function disposePrismaClient(client: PrismaClient | undefined) {
  if (!client) {
    return;
  }
  try {
    await client.$disconnect();
  } catch {
    // Ignore disconnect errors while replacing a stale singleton.
  }
}

function resolvePrismaClient(): PrismaClient {
  let candidate = globalForPrisma.prisma;

  if (isStalePrismaClient(candidate)) {
    void disposePrismaClient(candidate);
    candidate = undefined;
    globalForPrisma.prisma = undefined;
  }

  if (!candidate) {
    candidate = createPrismaClient();
    globalForPrisma.prismaCacheKey = PRISMA_CLIENT_CACHE_KEY;
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = candidate;
  }

  return candidate;
}

export function getPrismaClient(): PrismaClient {
  return resolvePrismaClient();
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = resolvePrismaClient();
    const value = Reflect.get(client as object, prop, client);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
