import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMeetingDate, serializeMeeting } from "@/lib/meeting-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const jobCondition = searchParams.get("jobCondition");

    const where: {
      meetingDate?: { gte: Date; lte: Date };
      jobCondition?: string;
    } = {};

    if (startDate && endDate) {
      where.meetingDate = {
        gte: parseMeetingDate(startDate),
        lte: parseMeetingDate(endDate),
      };
    }

    if (jobCondition) {
      where.jobCondition = jobCondition;
    }

    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: [{ meetingDate: "asc" }, { meetingHour: "asc" }],
    });

    return NextResponse.json(meetings.map(serializeMeeting));
  } catch (error) {
    console.error("GET /api/meetings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meetings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.companyName?.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    const meeting = await prisma.meeting.create({
      data: {
        meetingDate: parseMeetingDate(body.meetingDate),
        meetingHour: Number(body.meetingHour),
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

    return NextResponse.json(serializeMeeting(meeting), { status: 201 });
  } catch (error) {
    console.error("POST /api/meetings error:", error);
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "A meeting already exists for this date and time slot"
        : "Failed to create meeting";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
