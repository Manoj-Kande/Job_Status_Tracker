import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI (migrate/studio/db push) needs a direct, non-pooled connection.
    // The app's runtime PrismaClient (src/lib/prisma.ts) uses DATABASE_URL
    // (pooled, via the pg driver adapter) separately.
    url: env("DIRECT_URL"),
  },
});
