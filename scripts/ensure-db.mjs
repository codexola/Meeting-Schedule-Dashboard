import { spawn } from "node:child_process";
import net from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

function getDatabasePort() {
  const url = process.env.DATABASE_URL ?? "";
  const match = url.match(/:(\d+)\//);
  return Number(match?.[1] ?? 51214);
}

function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(1500);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPort(port, timeoutMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await sleep(1000);
  }
  return false;
}

export async function ensureDatabase() {
  const port = getDatabasePort();

  if (await isPortOpen(port)) {
    console.log(`Database already running on port ${port}`);
    return;
  }

  console.log(`Database not reachable on port ${port}. Starting Prisma dev...`);

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

  const ready = await waitForPort(port);
  if (!ready) {
    throw new Error(
      `Database did not become ready on port ${port}. Run "npx prisma dev" from the project root.`
    );
  }

  console.log(`Database is ready on port ${port}`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  ensureDatabase().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
