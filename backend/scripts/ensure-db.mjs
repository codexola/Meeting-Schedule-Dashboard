/**
 * Wait until the local database is actually serving queries (real SELECT 1).
 *
 * The database lifecycle is owned by the PM2 process "meeting-db" (see
 * ecosystem.config.cjs). This script only WAITS for it to be queryable so the
 * backend starts in the right order; it does not spawn its own database to
 * avoid two managers racing over the same port.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..");
config({ path: join(backendRoot, ".env") });

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function canQuery() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 3000,
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function ensureDatabase(timeoutMs = 60_000) {
  if (await canQuery()) {
    console.log("Database is reachable and serving queries.");
    return;
  }

  console.log("Waiting for the database to become available...");
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await sleep(1500);
    if (await canQuery()) {
      console.log("Database is ready and serving queries.");
      return;
    }
  }

  throw new Error(
    'Database is not available. Ensure it is running (PM2 "meeting-db", or run "npx prisma dev" from the project root).'
  );
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))
) {
  ensureDatabase().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
