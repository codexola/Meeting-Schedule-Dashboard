import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  const code = e.code ?? "";
  const msg = e.message ?? "";
  return (
    code === "ECONNREFUSED" ||
    code === "P1001" ||
    code === "P1017" ||
    /ECONNREFUSED|Connection terminated|Connection refused|Can't reach database/i.test(
      msg
    )
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry transient DB disconnects (e.g. brief prisma-dev restarts). */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; delayMs?: number } = {}
): Promise<T> {
  const retries = opts.retries ?? 4;
  const delayMs = opts.delayMs ?? 800;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === retries) {
        throw error;
      }
      console.warn(
        `Transient DB error (attempt ${attempt + 1}/${retries + 1}):`,
        (error as { code?: string }).code ?? (error as Error).message
      );
      await sleep(delayMs * (attempt + 1));
    }
  }

  throw lastError;
}

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

  const base = new PrismaClient({ adapter });

  // Automatically retry every query on brief connection drops so Vercel
  // callers do not see ECONNREFUSED while meeting-db is restarting.
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        return withDbRetry(() => query(args));
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
