import type { Company, CompanyStage, Meeting } from "../generated/prisma/client.js";
import {
  PIPELINE_STAGES,
  type PipelineStage,
  type StageOutcome,
  dateKeyFromDbDate,
} from "./constants.js";
import { parseMeetingDate } from "./meeting-utils.js";
import { prisma as prismaClient } from "./prisma.js";
import type { Company as CompanyDto, CompanyStage as CompanyStageDto } from "./types.js";

type Db = typeof prismaClient;

export function serializeCompanyStage(stage: CompanyStage): CompanyStageDto {
  return {
    id: stage.id,
    companyId: stage.companyId,
    stage: stage.stage,
    outcome: stage.outcome,
    meetingLink: stage.meetingLink,
    scheduledDate: stage.scheduledDate
      ? dateKeyFromDbDate(stage.scheduledDate)
      : null,
    scheduledHour: stage.scheduledHour,
    scheduledMinute: stage.scheduledMinute ?? 0,
    updatedAt: stage.updatedAt.toISOString(),
  };
}

export function serializeCompany(
  company: Company & {
    stages: CompanyStage[];
    _count?: { meetings: number };
    meetings?: Meeting[];
  }
): CompanyDto {
  const stages = PIPELINE_STAGES.map((def) => {
    const existing = company.stages.find((s) => s.stage === def.value);
    if (existing) return serializeCompanyStage(existing);
    return {
      id: "",
      companyId: company.id,
      stage: def.value,
      outcome: "NOT_STARTED",
      meetingLink: null,
      scheduledDate: null,
      scheduledHour: null,
      scheduledMinute: 0,
      updatedAt: company.updatedAt.toISOString(),
    };
  });

  return {
    id: company.id,
    name: company.name,
    caller: company.caller,
    jobSiteName: company.jobSiteName,
    jobPositionLink: company.jobPositionLink,
    contactName: company.contactName,
    contactPosition: company.contactPosition,
    chatLink: company.chatLink,
    jobCondition: company.jobCondition,
    meetingCount: company._count?.meetings ?? company.meetings?.length ?? 0,
    latestMeeting: company.meetings?.[0]
      ? {
          id: company.meetings[0].id,
          meetingDate: dateKeyFromDbDate(company.meetings[0].meetingDate),
          meetingHour: company.meetings[0].meetingHour,
          meetingMinute: company.meetings[0].meetingMinute ?? 0,
          meetingLink: company.meetings[0].meetingLink,
        }
      : null,
    stages,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  };
}

const JOB_STATUS_TO_STAGE: Record<
  string,
  { stage: PipelineStage; outcome: StageOutcome }
> = {
  JOB_APPLICATION_RECEIVED: {
    stage: "CASUAL_INTERVIEW",
    outcome: "WAITING",
  },
  JOB_APPLICATION_FAILED: {
    stage: "CASUAL_INTERVIEW",
    outcome: "FAIL",
  },
  CASUAL_INTERVIEW_PASS: { stage: "CASUAL_INTERVIEW", outcome: "PASS" },
  CASUAL_INTERVIEW_FAIL: { stage: "CASUAL_INTERVIEW", outcome: "FAIL" },
  DOCUMENT_SCREENING_SUBMITTED: {
    stage: "DOCUMENT_SCREENING",
    outcome: "WAITING",
  },
  DOCUMENT_SCREENING_PASS: { stage: "DOCUMENT_SCREENING", outcome: "PASS" },
  DOCUMENT_SCREENING_FAIL: { stage: "DOCUMENT_SCREENING", outcome: "FAIL" },
  FIRST_INTERVIEW_SCHEDULED: { stage: "FIRST_INTERVIEW", outcome: "SCHEDULED" },
  FIRST_INTERVIEW_PASS: { stage: "FIRST_INTERVIEW", outcome: "PASS" },
  FIRST_INTERVIEW_FAIL: { stage: "FIRST_INTERVIEW", outcome: "FAIL" },
  SECOND_INTERVIEW_SCHEDULED: {
    stage: "SECOND_INTERVIEW",
    outcome: "SCHEDULED",
  },
  SECOND_INTERVIEW_PASS: { stage: "SECOND_INTERVIEW", outcome: "PASS" },
  SECOND_INTERVIEW_FAIL: { stage: "SECOND_INTERVIEW", outcome: "FAIL" },
  THIRD_INTERVIEW_SCHEDULED: { stage: "THIRD_INTERVIEW", outcome: "SCHEDULED" },
  THIRD_INTERVIEW_PASS: { stage: "THIRD_INTERVIEW", outcome: "PASS" },
  THIRD_INTERVIEW_FAIL: { stage: "THIRD_INTERVIEW", outcome: "FAIL" },
  HIRING_WAITING: { stage: "HIRING", outcome: "WAITING" },
  HIRING_SCHEDULED: { stage: "HIRING", outcome: "SCHEDULED" },
  HIRING_PASS: { stage: "HIRING", outcome: "PASS" },
  HIRING_FAIL: { stage: "HIRING", outcome: "FAIL" },
};

const STAGE_OUTCOME_TO_JOB_STATUS: Record<
  PipelineStage,
  Partial<Record<StageOutcome, string>>
> = {
  CASUAL_INTERVIEW: {
    PASS: "CASUAL_INTERVIEW_PASS",
    FAIL: "CASUAL_INTERVIEW_FAIL",
    WAITING: "JOB_APPLICATION_RECEIVED",
    SCHEDULED: "JOB_APPLICATION_RECEIVED",
  },
  DOCUMENT_SCREENING: {
    PASS: "DOCUMENT_SCREENING_PASS",
    FAIL: "DOCUMENT_SCREENING_FAIL",
    WAITING: "DOCUMENT_SCREENING_SUBMITTED",
    SCHEDULED: "DOCUMENT_SCREENING_SUBMITTED",
  },
  FIRST_INTERVIEW: {
    PASS: "FIRST_INTERVIEW_PASS",
    FAIL: "FIRST_INTERVIEW_FAIL",
    WAITING: "FIRST_INTERVIEW_SCHEDULED",
    SCHEDULED: "FIRST_INTERVIEW_SCHEDULED",
  },
  SECOND_INTERVIEW: {
    PASS: "SECOND_INTERVIEW_PASS",
    FAIL: "SECOND_INTERVIEW_FAIL",
    WAITING: "SECOND_INTERVIEW_SCHEDULED",
    SCHEDULED: "SECOND_INTERVIEW_SCHEDULED",
  },
  THIRD_INTERVIEW: {
    PASS: "THIRD_INTERVIEW_PASS",
    FAIL: "THIRD_INTERVIEW_FAIL",
    WAITING: "THIRD_INTERVIEW_SCHEDULED",
    SCHEDULED: "THIRD_INTERVIEW_SCHEDULED",
  },
  HIRING: {
    PASS: "HIRING_PASS",
    FAIL: "HIRING_FAIL",
    WAITING: "HIRING_WAITING",
    SCHEDULED: "HIRING_SCHEDULED",
  },
};

const STAGE_ORDER: PipelineStage[] = [
  "CASUAL_INTERVIEW",
  "DOCUMENT_SCREENING",
  "FIRST_INTERVIEW",
  "SECOND_INTERVIEW",
  "THIRD_INTERVIEW",
  "HIRING",
];

export function jobStatusToStageOutcome(jobStatus: string): {
  stage: PipelineStage;
  outcome: StageOutcome;
} | null {
  return JOB_STATUS_TO_STAGE[jobStatus] ?? null;
}

export function stageOutcomeToJobStatus(
  stage: PipelineStage,
  outcome: StageOutcome
): string | null {
  if (outcome === "NOT_STARTED") return null;
  return STAGE_OUTCOME_TO_JOB_STATUS[stage]?.[outcome] ?? null;
}

export function countCompletedStages(stages: CompanyStageDto[]): number {
  return stages.filter(
    (s) => s.outcome === "PASS" || s.outcome === "SCHEDULED"
  ).length;
}

export async function ensureDefaultStages(db: Db, companyId: string) {
  for (const stage of PIPELINE_STAGES) {
    await db.companyStage.upsert({
      where: { companyId_stage: { companyId, stage: stage.value } },
      create: { companyId, stage: stage.value, outcome: "NOT_STARTED" },
      update: {},
    });
  }
}

export async function syncCompanyFromMeeting(db: Db, meeting: Meeting) {
  const name = meeting.companyName.trim();
  let company = await db.company.findUnique({
    where: { name },
    include: { stages: true },
  });

  if (!company) {
    const created = await db.company.create({
      data: {
        name,
        caller: meeting.caller,
        jobSiteName: meeting.jobSiteName,
        jobPositionLink: meeting.jobPositionLink,
        contactName: meeting.contactName,
        contactPosition: meeting.contactPosition,
        chatLink: meeting.chatLink,
        jobCondition: meeting.jobCondition,
      },
    });
    await ensureDefaultStages(db, created.id);
    company = { ...created, stages: [] };
  } else {
    await db.company.update({
      where: { id: company.id },
      data: {
        caller: meeting.caller ?? company.caller,
        jobSiteName: meeting.jobSiteName ?? company.jobSiteName,
        jobPositionLink: meeting.jobPositionLink ?? company.jobPositionLink,
        contactName: meeting.contactName ?? company.contactName,
        contactPosition: meeting.contactPosition ?? company.contactPosition,
        chatLink: meeting.chatLink ?? company.chatLink,
        jobCondition: meeting.jobCondition,
      },
    });
  }

  await db.meeting.update({
    where: { id: meeting.id },
    data: { companyId: company.id },
  });

  const mapping = jobStatusToStageOutcome(meeting.jobStatus);
  if (mapping) {
    const stageIndex = STAGE_ORDER.indexOf(mapping.stage);
    for (let i = 0; i <= stageIndex; i++) {
      const stageKey = STAGE_ORDER[i];
      const isCurrent = stageKey === mapping.stage;
      const outcome = isCurrent
        ? mapping.outcome
        : i < stageIndex
          ? "PASS"
          : "NOT_STARTED";

      await db.companyStage.upsert({
        where: {
          companyId_stage: { companyId: company.id, stage: stageKey },
        },
        create: {
          companyId: company.id,
          stage: stageKey,
          outcome,
          meetingLink: isCurrent ? meeting.meetingLink : null,
          scheduledDate: isCurrent ? meeting.meetingDate : null,
          scheduledHour: isCurrent ? meeting.meetingHour : null,
          scheduledMinute: isCurrent ? meeting.meetingMinute : null,
        },
        update: isCurrent
          ? {
              outcome,
              meetingLink: meeting.meetingLink,
              scheduledDate: meeting.meetingDate,
              scheduledHour: meeting.meetingHour,
              scheduledMinute: meeting.meetingMinute,
            }
          : i < stageIndex
            ? { outcome: "PASS" }
            : {},
      });
    }
  }

  return company.id;
}

/** Keep Company rows aligned with Schedule meetings — single source of truth. */
export async function removeOrphanCompanies(db: Db) {
  const result = await db.company.deleteMany({
    where: { meetings: { none: {} } },
  });
  return result.count;
}

export async function reconcileCompaniesFromMeetings(db: Db) {
  const meetings = await db.meeting.findMany({
    orderBy: [
      { meetingDate: "asc" },
      { meetingHour: "asc" },
      { meetingMinute: "asc" },
    ],
  });

  for (const meeting of meetings) {
    await syncCompanyFromMeeting(db, meeting);
  }

  const removed = await removeOrphanCompanies(db);

  const companyCount = await db.company.count();
  return {
    meetingCount: meetings.length,
    companyCount,
    removedOrphans: removed,
  };
}

export function parseStageDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  return parseMeetingDate(dateStr);
}
