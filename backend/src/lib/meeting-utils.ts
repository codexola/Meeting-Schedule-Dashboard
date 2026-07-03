import type { Meeting } from "../generated/prisma/client.js";
import {
  dateKeyFromDbDate,
  getMeetingDateTime,
  NOTIFICATION_LEAD_MINUTES,
} from "./constants.js";
import type { Meeting as MeetingDto } from "./types.js";

export function serializeMeeting(meeting: Meeting): MeetingDto {
  return {
    id: meeting.id,
    meetingDate: dateKeyFromDbDate(meeting.meetingDate),
    meetingHour: meeting.meetingHour,
    meetingMinute: meeting.meetingMinute ?? 0,
    meetingLink: meeting.meetingLink,
    companyName: meeting.companyName,
    companyId: meeting.companyId,
    caller: meeting.caller,
    jobSiteName: meeting.jobSiteName,
    jobPositionLink: meeting.jobPositionLink,
    interviewer: meeting.interviewer,
    contactName: meeting.contactName,
    contactPosition: meeting.contactPosition,
    chatLink: meeting.chatLink,
    jobStatus: meeting.jobStatus,
    jobCondition: meeting.jobCondition,
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}

export function parseMeetingDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function getUpcomingMeetings(
  meetings: MeetingDto[],
  leadMinutes = NOTIFICATION_LEAD_MINUTES,
  now = new Date()
): MeetingDto[] {
  return meetings
    .filter((meeting) => {
      const start = getMeetingDateTime(
        meeting.meetingDate,
        meeting.meetingHour,
        meeting.meetingMinute ?? 0
      );
      const diffMinutes = (start.getTime() - now.getTime()) / (60 * 1000);
      return diffMinutes > 0 && diffMinutes <= leadMinutes;
    })
    .sort((a, b) => {
      const aTime = getMeetingDateTime(
        a.meetingDate,
        a.meetingHour,
        a.meetingMinute ?? 0
      ).getTime();
      const bTime = getMeetingDateTime(
        b.meetingDate,
        b.meetingHour,
        b.meetingMinute ?? 0
      ).getTime();
      return aTime - bTime;
    });
}

export function toDateKeyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
