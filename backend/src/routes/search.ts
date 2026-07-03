import { Router } from "express";
import { serializeCompany } from "../lib/company-utils.js";
import { serializeMeeting } from "../lib/meeting-utils.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) {
      res.json({ query: "", companies: [], meetings: [] });
      return;
    }

    const [companies, meetings] = await Promise.all([
      prisma.company.findMany({
        where: {
          meetings: { some: {} },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { caller: { contains: q, mode: "insensitive" } },
            { jobSiteName: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { contactPosition: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          stages: { orderBy: { stage: "asc" } },
          _count: { select: { meetings: true } },
          meetings: {
            orderBy: [
              { meetingDate: "desc" },
              { meetingHour: "desc" },
              { meetingMinute: "desc" },
            ],
            take: 1,
          },
        },
        orderBy: { name: "asc" },
        take: 20,
      }),
      prisma.meeting.findMany({
        where: {
          OR: [
            { companyName: { contains: q, mode: "insensitive" } },
            { caller: { contains: q, mode: "insensitive" } },
            { jobSiteName: { contains: q, mode: "insensitive" } },
            { interviewer: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { contactPosition: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: [
          { meetingDate: "desc" },
          { meetingHour: "desc" },
          { meetingMinute: "desc" },
        ],
        take: 20,
      }),
    ]);

    res.json({
      query: q,
      companies: companies.map(serializeCompany),
      meetings: meetings.map(serializeMeeting),
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
