/**
 * Managed launcher for the local Prisma Postgres ("prisma dev") database.
 *
 * Intended to be run under PM2 as the "meeting-db" process so the database is
 * always-on and survives terminal/session closes and reboots.
 *
 * The prisma dev server can outlive its CLI (it detaches a child), which makes
 * a plain restart print "already running" and exit. To keep PM2 restarts clean,
 * this frees the DB port first, then runs `prisma dev` in the foreground so PM2
 * tracks its lifetime accurately.
 */
import { execSync, spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const prismaEntry = join(
  projectRoot,
  "backend",
  "node_modules",
  "prisma",
  "build",
  "index.js"
);

const DB_PORT = 51214;

function freePort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, {
      encoding: "utf8",
    });
    const pids = new Set();
    for (const line of out.split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5 && parts[3] === "LISTENING") {
        pids.add(parts[4]);
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Freed stale database process ${pid} on port ${port}`);
      } catch {
        // ignore
      }
    }
  } catch {
    // nothing listening
  }
}

console.log("Starting managed Prisma dev database...");
freePort(DB_PORT);

const child = spawn(process.execPath, [prismaEntry, "dev"], {
  cwd: projectRoot,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 0));
