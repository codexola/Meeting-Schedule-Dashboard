import { Router } from "express";
import { NOTIFICATION_LEAD_MINUTES } from "../lib/constants.js";
import {
  getUpcomingMeetings,
  parseMeetingDate,
  serializeMeeting,
  toDateKeyLocal,
} from "../lib/meeting-utils.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/upcoming", async (req, res) => {
  try {
    const leadMinutes = Number(
      req.query.leadMinutes ?? NOTIFICATION_LEAD_MINUTES
    );

    const now = new Date();
    const startDate = toDateKeyLocal(now);
    const end = new Date(now);
    end.setDate(end.getDate() + 1);
    const endDate = toDateKeyLocal(end);

    const meetings = await prisma.meeting.findMany({
      where: {
        meetingDate: {
          gte: parseMeetingDate(startDate),
          lte: parseMeetingDate(endDate),
        },
      },
      orderBy: [
        { meetingDate: "asc" },
        { meetingHour: "asc" },
        { meetingMinute: "asc" },
      ],
    });

    const serialized = meetings.map(serializeMeeting);
    const upcoming = getUpcomingMeetings(serialized, leadMinutes, now);

    res.json({
      leadMinutes,
      checkedAt: now.toISOString(),
      meetings: upcoming,
    });
  } catch (error) {
    console.error("GET /api/meetings/upcoming error:", error);
    res.status(500).json({ error: "Failed to fetch upcoming meetings" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { startDate, endDate, jobCondition } = req.query;

    const where: {
      meetingDate?: { gte: Date; lte: Date };
      jobCondition?: string;
    } = {};

    if (startDate && endDate) {
      where.meetingDate = {
        gte: parseMeetingDate(String(startDate)),
        lte: parseMeetingDate(String(endDate)),
      };
    }

    if (jobCondition) {
      where.jobCondition = String(jobCondition);
    }

    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: [
        { meetingDate: "asc" },
        { meetingHour: "asc" },
        { meetingMinute: "asc" },
      ],
    });

    res.json(meetings.map(serializeMeeting));
  } catch (error) {
    console.error("GET /api/meetings error:", error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;

    if (!body.companyName?.trim()) {
      res.status(400).json({ error: "Company name is required" });
      return;
    }

    const meeting = await prisma.meeting.create({
      data: {
        meetingDate: parseMeetingDate(body.meetingDate),
        meetingHour: Number(body.meetingHour),
        meetingMinute: Number(body.meetingMinute ?? 0),
        meetingLink: body.meetingLink?.trim() || null,
        companyName: body.companyName.trim(),
        caller: body.caller?.trim() || null,
        jobSiteName: body.jobSiteName?.trim() || null,
        jobPositionLink: body.jobPositionLink?.trim() || null,
        interviewer: body.interviewer?.trim() || null,
        contactName: body.contactName?.trim() || null,
        contactPosition: body.contactPosition?.trim() || null,
        chatLink: body.chatLink?.trim() || null,
        jobStatus: body.jobStatus || "JOB_APPLICATION_RECEIVED",
        jobCondition: body.jobCondition || "OK",
      },
    });

    res.status(201).json(serializeMeeting(meeting));
  } catch (error) {
    console.error("POST /api/meetings error:", error);
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "A meeting already exists for this date and time slot"
        : "Failed to create meeting";
    res.status(500).json({ error: message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: req.params.id },
    });

    if (!meeting) {
      res.status(404).json({ error: "Meeting not found" });
      return;
    }

    res.json(serializeMeeting(meeting));
  } catch (error) {
    console.error("GET /api/meetings/:id error:", error);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const body = req.body;

    if (body.companyName !== undefined && !body.companyName?.trim()) {
      res.status(400).json({ error: "Company name is required" });
      return;
    }

    const meeting = await prisma.meeting.update({
      where: { id: req.params.id },
      data: {
        ...(body.meetingDate !== undefined && {
          meetingDate: parseMeetingDate(body.meetingDate),
        }),
        ...(body.meetingHour !== undefined && {
          meetingHour: Number(body.meetingHour),
        }),
        ...(body.meetingMinute !== undefined && {
          meetingMinute: Number(body.meetingMinute),
        }),
        ...(body.meetingLink !== undefined && {
          meetingLink: body.meetingLink?.trim() || null,
        }),
        ...(body.companyName !== undefined && {
          companyName: body.companyName.trim(),
        }),
        ...(body.caller !== undefined && {
          caller: body.caller?.trim() || null,
        }),
        ...(body.jobSiteName !== undefined && {
          jobSiteName: body.jobSiteName?.trim() || null,
        }),
        ...(body.jobPositionLink !== undefined && {
          jobPositionLink: body.jobPositionLink?.trim() || null,
        }),
        ...(body.interviewer !== undefined && {
          interviewer: body.interviewer?.trim() || null,
        }),
        ...(body.contactName !== undefined && {
          contactName: body.contactName?.trim() || null,
        }),
        ...(body.contactPosition !== undefined && {
          contactPosition: body.contactPosition?.trim() || null,
        }),
        ...(body.chatLink !== undefined && {
          chatLink: body.chatLink?.trim() || null,
        }),
        ...(body.jobStatus !== undefined && { jobStatus: body.jobStatus }),
        ...(body.jobCondition !== undefined && {
          jobCondition: body.jobCondition,
        }),
      },
    });

    res.json(serializeMeeting(meeting));
  } catch (error) {
    console.error("PATCH /api/meetings/:id error:", error);
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "A meeting already exists for this date and time slot"
        : "Failed to update meeting";
    res.status(500).json({ error: message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.meeting.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/meetings/:id error:", error);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
});

export default router;
