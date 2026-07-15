import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    // Pool tuned for Prisma Postgres (local `prisma dev`) which drops recycled
    // idle connections. Keeping connections warm avoids the intermittent
    // "Connection terminated unexpectedly" error, while a bounded connect
    // timeout still fails fast when the database is genuinely down.
    max: 10,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
