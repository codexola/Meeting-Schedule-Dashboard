/**
 * Restore meetings + companies from data/*.json into PostgreSQL.
 * Usage (from repo root): node backend/scripts/restore-data.mjs
 */
import { readFileSync } from "node:fs";
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

const meetingsPath = join(repoRoot, "data", "meetings.json");
const companiesPath = join(repoRoot, "data", "companies.json");

function parseDateOnly(value) {
  if (!value) return null;
  const key = String(value).slice(0, 10);
  return key;
}

async function main() {
  const meetings = JSON.parse(readFileSync(meetingsPath, "utf8"));
  const companies = JSON.parse(readFileSync(companiesPath, "utf8"));

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    // Preserve restore targets: clear dependent tables in FK-safe order
    await client.query('DELETE FROM "Meeting"');
    await client.query('DELETE FROM "CompanyStage"');
    await client.query('DELETE FROM "Company"');

    for (const company of companies) {
      await client.query(
        `INSERT INTO "Company" (
          id, name, caller, "jobSiteName", "jobPositionLink",
          "contactName", "contactPosition", "chatLink", "jobCondition",
          "createdAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          caller = EXCLUDED.caller,
          "jobSiteName" = EXCLUDED."jobSiteName",
          "jobPositionLink" = EXCLUDED."jobPositionLink",
          "contactName" = EXCLUDED."contactName",
          "contactPosition" = EXCLUDED."contactPosition",
          "chatLink" = EXCLUDED."chatLink",
          "jobCondition" = EXCLUDED."jobCondition",
          "updatedAt" = EXCLUDED."updatedAt"`,
        [
          company.id,
          company.name,
          company.caller ?? null,
          company.jobSiteName ?? null,
          company.jobPositionLink ?? null,
          company.contactName ?? null,
          company.contactPosition ?? null,
          company.chatLink ?? null,
          company.jobCondition ?? "OK",
          company.createdAt ? new Date(company.createdAt) : new Date(),
          company.updatedAt ? new Date(company.updatedAt) : new Date(),
        ]
      );

      for (const stage of company.stages ?? []) {
        await client.query(
          `INSERT INTO "CompanyStage" (
            id, "companyId", stage, outcome, "meetingLink",
            "scheduledDate", "scheduledHour", "scheduledMinute", "updatedAt"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (id) DO UPDATE SET
            "companyId" = EXCLUDED."companyId",
            stage = EXCLUDED.stage,
            outcome = EXCLUDED.outcome,
            "meetingLink" = EXCLUDED."meetingLink",
            "scheduledDate" = EXCLUDED."scheduledDate",
            "scheduledHour" = EXCLUDED."scheduledHour",
            "scheduledMinute" = EXCLUDED."scheduledMinute",
            "updatedAt" = EXCLUDED."updatedAt"`,
          [
            stage.id,
            company.id,
            stage.stage,
            stage.outcome ?? "NOT_STARTED",
            stage.meetingLink ?? null,
            parseDateOnly(stage.scheduledDate),
            stage.scheduledHour ?? null,
            stage.scheduledMinute ?? null,
            stage.updatedAt ? new Date(stage.updatedAt) : new Date(),
          ]
        );
      }
    }

    for (const meeting of meetings) {
      await client.query(
        `INSERT INTO "Meeting" (
          id, "meetingDate", "meetingHour", "meetingMinute", "meetingLink",
          "companyName", "companyId", caller, "jobSiteName", "jobPositionLink",
          interviewer, "contactName", "contactPosition", "chatLink",
          "jobStatus", "jobCondition", "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
        )
        ON CONFLICT (id) DO UPDATE SET
          "meetingDate" = EXCLUDED."meetingDate",
          "meetingHour" = EXCLUDED."meetingHour",
          "meetingMinute" = EXCLUDED."meetingMinute",
          "meetingLink" = EXCLUDED."meetingLink",
          "companyName" = EXCLUDED."companyName",
          "companyId" = EXCLUDED."companyId",
          caller = EXCLUDED.caller,
          "jobSiteName" = EXCLUDED."jobSiteName",
          "jobPositionLink" = EXCLUDED."jobPositionLink",
          interviewer = EXCLUDED.interviewer,
          "contactName" = EXCLUDED."contactName",
          "contactPosition" = EXCLUDED."contactPosition",
          "chatLink" = EXCLUDED."chatLink",
          "jobStatus" = EXCLUDED."jobStatus",
          "jobCondition" = EXCLUDED."jobCondition",
          "updatedAt" = EXCLUDED."updatedAt"`,
        [
          meeting.id,
          parseDateOnly(meeting.meetingDate),
          meeting.meetingHour,
          meeting.meetingMinute ?? 0,
          meeting.meetingLink ?? null,
          meeting.companyName,
          meeting.companyId ?? null,
          meeting.caller ?? null,
          meeting.jobSiteName ?? null,
          meeting.jobPositionLink ?? null,
          meeting.interviewer ?? null,
          meeting.contactName ?? null,
          meeting.contactPosition ?? null,
          meeting.chatLink ?? null,
          meeting.jobStatus ?? "JOB_APPLICATION_RECEIVED",
          meeting.jobCondition ?? "OK",
          meeting.createdAt ? new Date(meeting.createdAt) : new Date(),
          meeting.updatedAt ? new Date(meeting.updatedAt) : new Date(),
        ]
      );
    }

    await client.query("COMMIT");
    console.log(
      `Restored ${companies.length} companies and ${meetings.length} meetings from data/`
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Restore failed:", error);
  process.exit(1);
});
