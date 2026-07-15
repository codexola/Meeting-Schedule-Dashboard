/**
 * Ensure the local database is actually serving queries before the backend
 * starts. Unlike a plain TCP port check, this runs a real `SELECT 1` so it can
 * never report a false "ready" (which previously led to ECONNREFUSED at runtime).
 *
 * If the database is down it starts `prisma dev` (detached) and waits until a
 * real query succeeds.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..");
const projectRoot = join(backendRoot, "..");

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

async function waitUntilQueryable(timeoutMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await canQuery()) return true;
    await sleep(1500);
  }
  return false;
}

export async function ensureDatabase() {
  if (await canQuery()) {
    console.log("Database is reachable and serving queries.");
    return;
  }

  console.log("Database not serving queries. Starting Prisma dev...");

  const child = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", "dev"],
    {
      cwd: projectRoot,
      stdio: "ignore",
      detached: true,
      shell: process.platform === "win32",
      env: process.env,
    }
  );
  child.unref();

  const ready = await waitUntilQueryable();
  if (!ready) {
    throw new Error(
      'Database did not become queryable. Start it manually with "npx prisma dev" from the project root.'
    );
  }

  console.log("Database is ready and serving queries.");
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
