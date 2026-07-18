/**
 * Managed launcher for the local Prisma Postgres ("prisma dev") database.
 *
 * Under PM2 as "meeting-db". Important behaviour:
 * - If the DB is already serving queries on 51214, do NOT kill it (that was
 *   causing restart flaps and ECONNREFUSED on the API). Become a watchdog.
 * - Only free the port / clear the lock when the port is held but dead.
 * - Trim oversized durable-streams telemetry (never touches .pglite data).
 */
import { execSync, spawn } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const backendRoot = join(projectRoot, "backend");

const require = createRequire(import.meta.url);
const { config } = require(join(backendRoot, "node_modules", "dotenv"));
config({ path: join(backendRoot, ".env") });
const pg = require(join(backendRoot, "node_modules", "pg"));

const prismaEntry = join(backendRoot, "node_modules", "prisma", "build", "index.js");
// Prefer system Node — Cursor's helper node is fragile if the IDE restarts.
const systemNode = process.env.PM2_NODE || "C:\\Program Files\\nodejs\\node.exe";
const nodeBin = existsSync(systemNode) ? systemNode : process.execPath;

const DB_PORT = 51214;
const STREAMS_MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function canQuery() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 2500,
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

function pidsOnPort(port) {
  const pids = new Set();
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, {
      encoding: "utf8",
    });
    for (const line of out.split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5 && parts[3] === "LISTENING") {
        pids.add(parts[4]);
      }
    }
  } catch {
    // nothing listening
  }
  return [...pids];
}

function freePort(port) {
  for (const pid of pidsOnPort(port)) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      console.log(`Freed stale database process ${pid} on port ${port}`);
    } catch {
      // ignore
    }
  }
}

function clearLock() {
  const lockFile = join(
    process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"),
    "prisma-dev-nodejs",
    "Data",
    "default",
    ".lock"
  );
  if (!existsSync(lockFile)) return;
  try {
    rmSync(lockFile, { force: true });
    console.log("Cleared stale Prisma lock file.");
  } catch {
    // ignore
  }
}

function dirSizeBytes(dir) {
  let total = 0;
  if (!existsSync(dir)) return 0;
  const walk = (p) => {
    for (const name of readdirSync(p)) {
      const full = join(p, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else total += st.size;
    }
  };
  try {
    walk(dir);
  } catch {
    // ignore
  }
  return total;
}

function trimDurableStreams() {
  const base = join(
    process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"),
    "prisma-dev-nodejs",
    "Data"
  );
  const streamsDir = join(base, "durable-streams");
  const pgliteDir = join(base, "default", ".pglite");
  if (!existsSync(streamsDir)) return;

  const size = dirSizeBytes(streamsDir);
  if (size < STREAMS_MAX_BYTES) return;

  console.log(
    `Prisma durable-streams is ${(size / 1024 / 1024 / 1024).toFixed(1)} GB (telemetry only). Trimming...`
  );
  console.log(
    `Meeting data (.pglite) left untouched (present=${existsSync(pgliteDir)})`
  );
  try {
    for (const name of readdirSync(streamsDir)) {
      rmSync(join(streamsDir, name), { recursive: true, force: true });
    }
    console.log("Durable-streams trimmed.");
  } catch (error) {
    console.warn("Could not trim durable-streams:", error.message);
  }
}

async function watchExisting() {
  console.log(
    `Database already serving queries on port ${DB_PORT}. Watching (will not kill it).`
  );
  while (true) {
    await sleep(10_000);
    if (!(await canQuery())) {
      console.error("Database stopped serving queries. Exiting so PM2 can restart.");
      process.exit(1);
    }
  }
}

async function startFresh() {
  const occupied = pidsOnPort(DB_PORT);
  if (occupied.length) {
    console.log(
      `Port ${DB_PORT} is occupied but not queryable. Freeing: ${occupied.join(", ")}`
    );
    freePort(DB_PORT);
    clearLock();
    await sleep(1500);
  } else {
    clearLock();
  }

  trimDurableStreams();

  console.log(`Starting prisma dev with ${nodeBin}...`);
  const child = spawn(nodeBin, [prismaEntry, "dev"], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
    shell: false,
    // Prevent a visible "node.exe" console window on Windows. Closing that
    // window was killing the database and breaking the Vercel frontend.
    windowsHide: true,
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

console.log("Starting managed Prisma dev database...");
if (await canQuery()) {
  await watchExisting();
} else {
  await startFresh();
}
