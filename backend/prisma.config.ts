import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const backendRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(backendRoot, "..");
loadEnvFile(join(projectRoot, ".env"));
loadEnvFile(join(backendRoot, ".env"));

export default defineConfig({
  schema: join(projectRoot, "prisma/schema.prisma"),
  migrations: {
    path: join(projectRoot, "prisma/migrations"),
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
