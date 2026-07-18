/**
 * Ensure the local database is actually serving queries (real SELECT 1).
 *
 * Prefer waiting for the PM2-managed "meeting-db". Only start it when it is
 * missing/stopped — never restart a healthy online process (that caused
 * freePort kills → lock races → ECONNREFUSED flaps).
 */
import { execSync } from "node:child_process";
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

function pm2Status(name) {
  try {
    const raw = execSync("pm2 jlist", { encoding: "utf8" });
    const list = JSON.parse(raw);
    const app = list.find((p) => p.name === name);
    return app?.pm2_env?.status ?? "missing";
  } catch {
    return "missing";
  }
}

function tryStartViaPm2() {
  try {
    execSync("pm2 -v", { stdio: "ignore" });
  } catch {
    return false;
  }

  const status = pm2Status("meeting-db");
  if (status === "online") {
    console.log('PM2 "meeting-db" is online — waiting for queries (no restart).');
    return true;
  }

  const ecosystem = join(projectRoot, "ecosystem.config.cjs");
  console.log(`Database down — PM2 meeting-db is ${status}; starting...`);
  try {
    if (status === "stopped") {
      execSync("pm2 restart meeting-db", {
        cwd: projectRoot,
        stdio: "inherit",
        env: process.env,
      });
    } else {
      execSync(`pm2 start "${ecosystem}" --only meeting-db`, {
        cwd: projectRoot,
        stdio: "inherit",
        env: process.env,
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function ensureDatabase(timeoutMs = 90_000) {
  if (await canQuery()) {
    console.log("Database is reachable and serving queries.");
    return;
  }

  tryStartViaPm2();

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
    'Database is not available. Run: pm2 start meeting-db   (or "npx prisma dev" from the project root).'
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
