import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const sql = readFileSync(
  join(root, "prisma/migrations/20260703120000_add_companies/migration.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
});

await client.connect();
await client.query(sql);
console.log("Companies migration applied");

const tables = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('Company', 'CompanyStage')
`);
console.log(
  "Tables:",
  tables.rows.map((r) => r.table_name).join(", ")
);

await client.end();
