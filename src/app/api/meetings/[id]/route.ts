import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMeetingDate, serializeMeeting } from "@/lib/meeting-utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const meeting = await prisma.meeting.findUnique({ where: { id } });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    return NextResponse.json(serializeMeeting(meeting));
  } catch (error) {
    console.error("GET /api/meetings/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (body.companyName !== undefined && !body.companyName?.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        ...(body.meetingDate !== undefined && {
          meetingDate: parseMeetingDate(body.meetingDate),
        }),
        ...(body.meetingHour !== undefined && {
          meetingHour: Number(body.meetingHour),
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

    return NextResponse.json(serializeMeeting(meeting));
  } catch (error) {
    console.error("PATCH /api/meetings/[id] error:", error);
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "A meeting already exists for this date and time slot"
        : "Failed to update meeting";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.meeting.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/meetings/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete meeting" },
      { status: 500 }
    );
  }
}
