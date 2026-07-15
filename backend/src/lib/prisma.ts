import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    // Fail fast when the database is unreachable so requests return an error
    // quickly instead of hanging and piling up CLOSE_WAIT sockets that would
    // otherwise wedge the whole backend.
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    max: 10,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
