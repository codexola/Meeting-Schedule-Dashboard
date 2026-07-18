/**
 * Backend launcher.
 *
 * Prefer the always-on PM2 stack (meeting-db + meeting-backend). Running
 * `npm run dev` used to kill whatever was on port 3100, which tore down the
 * production PM2 backend and left Vercel with a half-dead process.
 *
 * Child processes are spawned with windowsHide so Windows does not pop up
 * cmd.exe / node.exe console windows (closing those used to kill the API).
 *
 * Escape hatch for true local development (tsx watch):
 *   set FORCE_LOCAL=1
 */
import { execSync, execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..");
const projectRoot = join(backendRoot, "..");
config({ path: join(backendRoot, ".env") });

const HOST = process.env.HOST ?? "103.179.45.111";
const PORT = process.env.PORT ?? "3100";
const FORCE_LOCAL = process.env.FORCE_LOCAL === "1";
const RUNNING_UNDER_PM2 =
  process.env.pm_id !== undefined ||
  process.env.name === "meeting-backend";

const systemNode = "C:\\Program Files\\nodejs\\node.exe";
const nodeBin = existsSync(systemNode) ? systemNode : process.execPath;
const tsxCli = join(backendRoot, "node_modules", "tsx", "dist", "cli.mjs");

function run(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: opts.stdio ?? "pipe",
    cwd: opts.cwd ?? projectRoot,
    env: process.env,
    windowsHide: true,
  });
}

function pm2Available() {
  try {
    run("pm2 -v");
    return true;
  } catch {
    return false;
  }
}

function pm2Status(name) {
  try {
    const raw = run("pm2 jlist");
    const list = JSON.parse(raw);
    const app = list.find((p) => p.name === name);
    return app?.pm2_env?.status ?? "missing";
  } catch {
    return "missing";
  }
}

function ensurePm2Stack() {
  const ecosystem = join(projectRoot, "ecosystem.config.cjs");
  console.log("Ensuring always-on PM2 stack (meeting-db + meeting-backend)...");

  const dbStatus = pm2Status("meeting-db");
  const apiStatus = pm2Status("meeting-backend");

  if (dbStatus === "online" && apiStatus === "online") {
    console.log("meeting-db is already online.");
    console.log("meeting-backend is already online.");
  } else {
    for (const name of ["meeting-db", "meeting-backend"]) {
      const status = pm2Status(name);
      if (status === "online") {
        console.log(`${name} is already online.`);
        continue;
      }
      console.log(`${name} is ${status}; starting...`);
      try {
        if (status === "stopped") {
          run(`pm2 restart ${name}`, { stdio: "inherit" });
        } else {
          run(`pm2 start "${ecosystem}" --only ${name}`, { stdio: "inherit" });
        }
      } catch (error) {
        console.error(`Failed to start ${name}:`, error.message);
      }
    }

    try {
      run("pm2 save");
    } catch {
      // ignore
    }
  }

  console.log("");
  console.log(`Backend should be reachable at http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log("Logs: pm2 logs meeting-backend");
  console.log("");
  console.log(
    "Tip: do not run a second local backend. For tsx-watch local mode set FORCE_LOCAL=1."
  );
}

function killPid(pid) {
  if (!pid || pid === String(process.pid)) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /F`, {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    }
    console.log(`Stopped process ${pid}`);
  } catch {
    // ignore
  }
}

function killPort(port) {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
        windowsHide: true,
      });
      const pids = new Set();
      for (const line of output.split("\n")) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[3] === "LISTENING") {
          pids.add(parts[4]);
        }
      }
      for (const pid of pids) killPid(pid);
    }
  } catch {
    // ignore
  }
}

/** Spawn without a visible Windows console (no cmd.exe popup). */
function spawnHidden(command, args, opts = {}) {
  return spawn(command, args, {
    ...opts,
    shell: false,
    windowsHide: true,
    stdio: opts.stdio ?? "inherit",
  });
}

function startTsxWatch() {
  if (!existsSync(tsxCli)) {
    console.error(`tsx not found at ${tsxCli}. Run: npm install --prefix backend`);
    process.exit(1);
  }

  return spawnHidden(nodeBin, [tsxCli, "watch", "src/index.ts"], {
    cwd: backendRoot,
    env: { ...process.env, HOST, PORT },
  });
}

function startLocalWatch() {
  console.log(
    `FORCE_LOCAL=1 — starting local tsx watch on http://${HOST}:${PORT}`
  );
  console.log(
    "(This will stop whatever is currently on that port, including PM2.)"
  );

  if (pm2Available() && pm2Status("meeting-backend") === "online") {
    console.log("Stopping PM2 meeting-backend for local mode...");
    try {
      run("pm2 stop meeting-backend", { stdio: "inherit" });
    } catch {
      // ignore
    }
  }

  killPort(PORT);

  try {
    execFileSync(nodeBin, ["scripts/ensure-db.mjs"], {
      cwd: backendRoot,
      stdio: "inherit",
      env: process.env,
      windowsHide: true,
    });
  } catch {
    console.error(
      'Database is not running. Start it with: pm2 start meeting-db  (or "npx prisma dev")'
    );
    process.exit(1);
  }

  const child = startTsxWatch();
  child.on("exit", (code) => process.exit(code ?? 0));
}

if (!FORCE_LOCAL && !RUNNING_UNDER_PM2 && pm2Available()) {
  ensurePm2Stack();
  process.exit(0);
}

if (RUNNING_UNDER_PM2) {
  console.log(`Starting backend (PM2) on http://${HOST}:${PORT}`);

  try {
    execFileSync(nodeBin, ["scripts/ensure-db.mjs"], {
      cwd: backendRoot,
      stdio: "inherit",
      env: process.env,
      windowsHide: true,
    });
  } catch {
    console.error(
      'Database is not running. Start it with: pm2 start meeting-db  (or "npx prisma dev")'
    );
    process.exit(1);
  }

  const child = startTsxWatch();
  child.on("exit", (code) => process.exit(code ?? 0));
} else if (!FORCE_LOCAL) {
  console.warn(
    "PM2 is not available. Falling back to local mode. Install PM2 for always-on operation."
  );
  startLocalWatch();
} else {
  startLocalWatch();
}
