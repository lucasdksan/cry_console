import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function migrationDatabaseUrl(): string {
  if (process.env.DIRECT_URL) {
    return env("DIRECT_URL");
  }

  return env("DATABASE_URL");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationDatabaseUrl(),
  },
});
