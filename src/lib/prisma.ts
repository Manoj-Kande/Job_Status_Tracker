import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma 7 removed the bundled query engine - the client now connects through
// a driver adapter. DATABASE_URL should be the pooled connection string
// (e.g. Neon's pgbouncer URL); DIRECT_URL (used only by the CLI, see
// prisma.config.ts) is the direct connection used for migrations.
//
// Neon's free tier suspends its compute after a few minutes idle; the first
// query after that wakes it back up, which can take several seconds. A short
// connect timeout fails that first request outright ("Can't reach database
// server") even though a refresh moments later succeeds once it's warm. A
// longer timeout here lets that wake-up finish instead of erroring.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15_000,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
