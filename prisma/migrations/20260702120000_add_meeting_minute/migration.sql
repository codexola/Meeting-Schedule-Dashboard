-- Add meetingMinute column
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "meetingMinute" INTEGER NOT NULL DEFAULT 0;

-- Replace unique index to include minute
DROP INDEX IF EXISTS "Meeting_meetingDate_meetingHour_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Meeting_meetingDate_meetingHour_meetingMinute_key"
  ON "Meeting"("meetingDate", "meetingHour", "meetingMinute");
