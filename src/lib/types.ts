import type { JobCondition, JobStatus } from "./constants";

export interface Meeting {
  id: string;
  meetingDate: string;
  meetingHour: number;
  meetingMinute: number;
  meetingLink: string | null;
  companyName: string;
  caller: string | null;
  jobSiteName: string | null;
  jobPositionLink: string | null;
  interviewer: string | null;
  contactName: string | null;
  contactPosition: string | null;
  chatLink: string | null;
  jobStatus: JobStatus | string;
  jobCondition: JobCondition | string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingFormData {
  meetingDate: string;
  meetingHour: number;
  meetingMinute: number;
  meetingLink: string;
  companyName: string;
  caller: string;
  jobSiteName: string;
  jobPositionLink: string;
  interviewer: string;
  contactName: string;
  contactPosition: string;
  chatLink: string;
  jobStatus: string;
  jobCondition: string;
}

export const emptyMeetingForm = (
  date: string,
  hour: number,
  minute = 0
): MeetingFormData => ({
  meetingDate: date,
  meetingHour: hour,
  meetingMinute: minute,
  meetingLink: "",
  companyName: "",
  caller: "",
  jobSiteName: "",
  jobPositionLink: "",
  interviewer: "",
  contactName: "",
  contactPosition: "",
  chatLink: "",
  jobStatus: "JOB_APPLICATION_RECEIVED",
  jobCondition: "OK",
});
