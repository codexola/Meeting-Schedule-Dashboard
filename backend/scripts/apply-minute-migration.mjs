import pg from "pg";

const client = new pg.Client({
  connectionString:
    "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
});

await client.connect();

const columns = await client.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'Meeting'
  ORDER BY ordinal_position
`);
console.log("Columns:", columns.rows.map((row) => row.column_name).join(", "));

const migrationSql = `
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "meetingMinute" INTEGER NOT NULL DEFAULT 0;
DROP INDEX IF EXISTS "Meeting_meetingDate_meetingHour_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Meeting_meetingDate_meetingHour_meetingMinute_key"
  ON "Meeting"("meetingDate", "meetingHour", "meetingMinute");
`;

await client.query(migrationSql);
console.log("Migration applied");

const indexes = await client.query(`
  SELECT indexname
  FROM pg_indexes
  WHERE tablename = 'Meeting'
`);
console.log("Indexes:", indexes.rows.map((row) => row.indexname).join(", "));

await client.end();
