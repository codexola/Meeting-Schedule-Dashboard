-- CreateTable
CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "caller" TEXT,
    "jobSiteName" TEXT,
    "jobPositionLink" TEXT,
    "contactName" TEXT,
    "contactPosition" TEXT,
    "chatLink" TEXT,
    "jobCondition" TEXT NOT NULL DEFAULT 'OK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CompanyStage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "meetingLink" TEXT,
    "scheduledDate" DATE,
    "scheduledHour" INTEGER,
    "scheduledMinute" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyStage_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyStage_companyId_stage_key" ON "CompanyStage"("companyId", "stage");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Meeting_companyId_idx" ON "Meeting"("companyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Meeting_companyName_idx" ON "Meeting"("companyName");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CompanyStage" ADD CONSTRAINT "CompanyStage_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
