import { NextRequest, NextResponse } from "next/server";
import { NOTIFICATION_LEAD_MINUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  getUpcomingMeetings,
  parseMeetingDate,
  serializeMeeting,
  toDateKeyLocal,
} from "@/lib/meeting-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadMinutes = Number(
      searchParams.get("leadMinutes") ?? NOTIFICATION_LEAD_MINUTES
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
      orderBy: [{ meetingDate: "asc" }, { meetingHour: "asc" }],
    });

    const serialized = meetings.map(serializeMeeting);
    const upcoming = getUpcomingMeetings(serialized, leadMinutes, now);

    return NextResponse.json({
      leadMinutes,
      checkedAt: now.toISOString(),
      meetings: upcoming,
    });
  } catch (error) {
    console.error("GET /api/meetings/upcoming error:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming meetings" },
      { status: 500 }
    );
  }
}
