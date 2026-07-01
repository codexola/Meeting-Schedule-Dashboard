-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "meetingDate" DATE NOT NULL,
    "meetingHour" INTEGER NOT NULL,
    "meetingLink" TEXT,
    "companyName" TEXT NOT NULL,
    "caller" TEXT,
    "jobSiteName" TEXT,
    "jobPositionLink" TEXT,
    "interviewer" TEXT,
    "contactName" TEXT,
    "contactPosition" TEXT,
    "chatLink" TEXT,
    "jobStatus" TEXT NOT NULL DEFAULT 'JOB_APPLICATION_RECEIVED',
    "jobCondition" TEXT NOT NULL DEFAULT 'OK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Meeting_jobCondition_idx" ON "Meeting"("jobCondition");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_meetingDate_meetingHour_key" ON "Meeting"("meetingDate", "meetingHour");
