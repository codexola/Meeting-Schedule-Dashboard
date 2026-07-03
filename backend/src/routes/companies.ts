import { Router } from "express";
import {
  parseStageDate,
  serializeCompany,
  stageOutcomeToJobStatus,
} from "../lib/company-utils.js";
import { PIPELINE_STAGES } from "../lib/constants.js";
import { serializeMeeting } from "../lib/meeting-utils.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const companyInclude = {
  stages: { orderBy: { stage: "asc" as const } },
  _count: { select: { meetings: true } },
};

router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    const where = q
      ? {
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
        }
      : {};

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
    const meetings = await prisma.meeting.findMany();
    const { syncCompanyFromMeeting } = await import(
      "../lib/company-utils.js"
    );

    for (const meeting of meetings) {
      await syncCompanyFromMeeting(prisma, meeting);
    }

    res.json({ synced: meetings.length, total: meetings.length });
  } catch (error) {
    console.error("POST /api/companies/sync error:", error);
    res.status(500).json({ error: "Failed to sync companies from meetings" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
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

    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
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

    const stage = await prisma.companyStage.upsert({
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

    if (outcome && outcome !== "NOT_STARTED") {
      const jobStatus = stageOutcomeToJobStatus(
        stageKey as (typeof PIPELINE_STAGES)[number]["value"],
        outcome
      );
      if (jobStatus) {
        const latestMeeting = await prisma.meeting.findFirst({
          where: { companyId: company.id },
          orderBy: [
            { meetingDate: "desc" },
            { meetingHour: "desc" },
            { meetingMinute: "desc" },
          ],
        });
        if (latestMeeting) {
          await prisma.meeting.update({
            where: { id: latestMeeting.id },
            data: {
              jobStatus,
              ...(outcome === "FAIL" && { jobCondition: "REJECT" }),
              ...(meetingLink !== undefined && { meetingLink }),
              ...(scheduledDate !== undefined && {
                meetingDate: scheduledDate ?? latestMeeting.meetingDate,
              }),
              ...(scheduledHour !== undefined &&
                scheduledHour !== null && { meetingHour: scheduledHour }),
              ...(scheduledMinute !== undefined &&
                scheduledMinute !== null && {
                  meetingMinute: scheduledMinute,
                }),
            },
          });
        }
      }
    }

    const updated = await prisma.company.findUnique({
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
