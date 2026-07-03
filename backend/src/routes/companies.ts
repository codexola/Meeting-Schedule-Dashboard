import { Router } from "express";
import {
  parseStageDate,
  removeOrphanCompanies,
  reconcileCompaniesFromMeetings,
  serializeCompany,
  stageOutcomeToJobStatus,
  syncCompanyFromMeeting,
} from "../lib/company-utils.js";
import { PIPELINE_STAGES } from "../lib/constants.js";
import { serializeMeeting } from "../lib/meeting-utils.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const companyInclude = {
  stages: { orderBy: { stage: "asc" as const } },
  _count: { select: { meetings: true } },
  meetings: {
    orderBy: [
      { meetingDate: "desc" as const },
      { meetingHour: "desc" as const },
      { meetingMinute: "desc" as const },
    ],
    take: 1,
  },
};

const scheduledCompanyFilter = {
  meetings: { some: {} },
};

router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    const where = q
      ? {
          AND: [
            scheduledCompanyFilter,
            {
              OR: [
                { name: { contains: String(q), mode: "insensitive" as const } },
                { caller: { contains: String(q), mode: "insensitive" as const } },
                {
                  jobSiteName: {
                    contains: String(q),
                    mode: "insensitive" as const,
                  },
                },
                {
                  contactName: {
                    contains: String(q),
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          ],
        }
      : scheduledCompanyFilter;

    const companies = await prisma.company.findMany({
      where,
      include: companyInclude,
      orderBy: { name: "asc" },
    });

    res.json(companies.map(serializeCompany));
  } catch (error) {
    console.error("GET /api/companies error:", error);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

router.post("/sync", async (_req, res) => {
  try {
    const result = await reconcileCompaniesFromMeetings(prisma);
    res.json(result);
  } catch (error) {
    console.error("POST /api/companies/sync error:", error);
    res.status(500).json({ error: "Failed to sync companies from meetings" });
  }
});

router.get("/:id", async (req, res) => {
  try {

    const company = await prisma.company.findFirst({
      where: {
        id: req.params.id,
        ...scheduledCompanyFilter,
      },
      include: companyInclude,
    });

    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    res.json(serializeCompany(company));
  } catch (error) {
    console.error("GET /api/companies/:id error:", error);
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

router.get("/:id/meetings", async (req, res) => {
  try {
    const meetings = await prisma.meeting.findMany({
      where: { companyId: req.params.id },
      orderBy: [
        { meetingDate: "desc" },
        { meetingHour: "desc" },
        { meetingMinute: "desc" },
      ],
    });
    res.json(meetings.map(serializeMeeting));
  } catch (error) {
    console.error("GET /api/companies/:id/meetings error:", error);
    res.status(500).json({ error: "Failed to fetch company meetings" });
  }
});

router.patch("/:id/stages/:stage", async (req, res) => {
  try {
    const stageKey = req.params.stage;
    const validStage = PIPELINE_STAGES.some((s) => s.value === stageKey);
    if (!validStage) {
      res.status(400).json({ error: "Invalid stage" });
      return;
    }

    const company = await prisma.company.findFirst({
      where: {
        id: req.params.id,
        ...scheduledCompanyFilter,
      },
    });
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    const body = req.body;
    const outcome = body.outcome ?? undefined;
    const meetingLink =
      body.meetingLink !== undefined
        ? body.meetingLink?.trim() || null
        : undefined;
    const scheduledDate =
      body.scheduledDate !== undefined
        ? parseStageDate(body.scheduledDate)
        : undefined;
    const scheduledHour =
      body.scheduledHour !== undefined
        ? body.scheduledHour === null
          ? null
          : Number(body.scheduledHour)
        : undefined;
    const scheduledMinute =
      body.scheduledMinute !== undefined
        ? body.scheduledMinute === null
          ? null
          : Number(body.scheduledMinute)
        : undefined;

    await prisma.companyStage.upsert({
      where: {
        companyId_stage: { companyId: company.id, stage: stageKey },
      },
      create: {
        companyId: company.id,
        stage: stageKey,
        outcome: outcome ?? "NOT_STARTED",
        meetingLink: meetingLink ?? null,
        scheduledDate: scheduledDate ?? null,
        scheduledHour: scheduledHour ?? null,
        scheduledMinute: scheduledMinute ?? 0,
      },
      update: {
        ...(outcome !== undefined && { outcome }),
        ...(meetingLink !== undefined && { meetingLink }),
        ...(scheduledDate !== undefined && { scheduledDate }),
        ...(scheduledHour !== undefined && { scheduledHour }),
        ...(scheduledMinute !== undefined && { scheduledMinute }),
      },
    });

    const latestMeeting = await prisma.meeting.findFirst({
      where: { companyId: company.id },
      orderBy: [
        { meetingDate: "desc" },
        { meetingHour: "desc" },
        { meetingMinute: "desc" },
      ],
    });

    if (!latestMeeting) {
      res.status(404).json({ error: "No schedule meeting found for company" });
      return;
    }

    const jobStatus =
      outcome && outcome !== "NOT_STARTED"
        ? stageOutcomeToJobStatus(
            stageKey as (typeof PIPELINE_STAGES)[number]["value"],
            outcome
          )
        : null;

    await prisma.meeting.update({
      where: { id: latestMeeting.id },
      data: {
        ...(jobStatus && { jobStatus }),
        ...(outcome === "FAIL" && { jobCondition: "REJECT" }),
        ...(outcome === "PASS" && { jobCondition: "OK" }),
        ...(meetingLink !== undefined && { meetingLink }),
        ...(scheduledDate !== undefined &&
          scheduledDate !== null && { meetingDate: scheduledDate }),
        ...(scheduledHour !== undefined &&
          scheduledHour !== null && { meetingHour: scheduledHour }),
        ...(scheduledMinute !== undefined &&
          scheduledMinute !== null && { meetingMinute: scheduledMinute }),
      },
    });

    const refreshedMeeting = await prisma.meeting.findUnique({
      where: { id: latestMeeting.id },
    });
    if (refreshedMeeting) {
      await syncCompanyFromMeeting(prisma, refreshedMeeting);
    }
    await removeOrphanCompanies(prisma);

    const updated = await prisma.company.findFirst({
      where: { id: company.id },
      include: companyInclude,
    });

    res.json(serializeCompany(updated!));
  } catch (error) {
    console.error("PATCH /api/companies/:id/stages/:stage error:", error);
    res.status(500).json({ error: "Failed to update company stage" });
  }
});

export default router;
