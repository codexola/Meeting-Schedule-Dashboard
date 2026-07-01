import { execSync, spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..");
const HOST = process.env.HOST ?? "103.179.45.111";
const PORT = process.env.PORT ?? "4000";

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
    // ignore
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
    }
  } catch {
    // ignore
  }
}

console.log(`Starting backend on http://${HOST}:${PORT}`);
killPort(PORT);

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", "watch", "src/index.ts"],
  {
    cwd: backendRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, HOST, PORT },
  }
);

child.on("exit", (code) => process.exit(code ?? 0));
