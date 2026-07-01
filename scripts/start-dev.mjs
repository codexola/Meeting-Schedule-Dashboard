import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const HOST = process.env.HOST ?? "103.179.45.111";
const PORT = process.env.PORT ?? "3000";
const projectRoot = process.cwd();
const lockPath = join(projectRoot, ".next", "dev", "lock");

function killPid(pid) {
  if (!pid || pid === String(process.pid)) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    }
    console.log(`Stopped process ${pid}`);
  } catch {
    // Process may already be gone.
  }
}

function killPort(port) {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
      });
      const pids = new Set();
      for (const line of output.split("\n")) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[3] === "LISTENING") {
          pids.add(parts[4]);
        }
      }
      for (const pid of pids) killPid(pid);
      return;
    }

    const output = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" });
    for (const pid of output.split("\n").map((v) => v.trim()).filter(Boolean)) {
      killPid(pid);
    }
  } catch {
    // Nothing listening on the port.
  }
}

function clearDevLock() {
  if (!existsSync(lockPath)) return;

  try {
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    if (lock?.pid) killPid(String(lock.pid));
  } catch {
    // Ignore malformed lock files.
  }

  try {
    unlinkSync(lockPath);
    console.log("Removed stale Next.js dev lock");
  } catch {
    // Ignore.
  }
}

console.log(`Preparing dev server on http://${HOST}:${PORT}`);
killPort(PORT);
killPort("3001");
clearDevLock();

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "dev", "-H", HOST, "-p", PORT],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  }
);

child.on("exit", (code) => process.exit(code ?? 0));
