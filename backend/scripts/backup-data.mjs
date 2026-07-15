/**
 * Snapshot the current database (companies + meetings) into data/backups/.
 *
 * The canonical archives (data/meetings.json, data/companies.json) are left
 * untouched so previously stored archives are preserved exactly as they are.
 * Every run writes a fresh timestamped snapshot so no data is ever lost.
 *
 * Usage (from repo root): node backend/scripts/backup-data.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
config({ path: join(__dirname, "..", ".env") });

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

const dataDir = join(repoRoot, "data");
const backupsDir = join(dataDir, "backups");

async function main() {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const companies = await client.query(`SELECT * FROM "Company"`);
    const stages = await client.query(`SELECT * FROM "CompanyStage"`);
    const meetings = await client.query(`SELECT * FROM "Meeting"`);

    const stagesByCompany = new Map();
    for (const stage of stages.rows) {
      const list = stagesByCompany.get(stage.companyId) ?? [];
      list.push(stage);
      stagesByCompany.set(stage.companyId, list);
    }

    const companiesOut = companies.rows.map((company) => ({
      ...company,
      stages: stagesByCompany.get(company.id) ?? [],
    }));

    mkdirSync(backupsDir, { recursive: true });

    const meetingsJson = JSON.stringify(meetings.rows, null, 2);
    const companiesJson = JSON.stringify(companiesOut, null, 2);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(join(backupsDir, `meetings-${stamp}.json`), meetingsJson);
    writeFileSync(join(backupsDir, `companies-${stamp}.json`), companiesJson);

    console.log(
      `Backed up ${meetings.rows.length} meetings and ${companiesOut.length} companies to data/backups/ (snapshot ${stamp}).`
    );
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error("Backup failed:", error);
  process.exit(1);
});
