export const HOUR_START = 9;
export const HOUR_END = 21;

export const TIME_SLOTS = Array.from(
  { length: HOUR_END - HOUR_START + 1 },
  (_, i) => HOUR_START + i
);

export const CALLERS = [
  { value: "WANG_BUG", label: "Wang Bug" },
  { value: "ORION", label: "Orion" },
  { value: "DAMIEN_DAVIAU", label: "Damien Daviau" },
  { value: "ALEX", label: "Alex" },
] as const;

export const JOB_SITES = [
  { value: "FINDY", label: "Findy" },
  { value: "TALENT", label: "Talent" },
  { value: "GREEN", label: "Green" },
  { value: "WATEDLY", label: "Watedly" },
] as const;

export const JOB_STATUSES = [
  { value: "JOB_APPLICATION_RECEIVED", label: "Job Application Received" },
  { value: "JOB_APPLICATION_FAILED", label: "Job Application Failed" },
  { value: "CASUAL_INTERVIEW_PASS", label: "Casual Interview Pass" },
  { value: "CASUAL_INTERVIEW_FAIL", label: "Casual Interview Fail" },
  { value: "DOCUMENT_SCREENING_SUBMITTED", label: "Document Screening Submitted" },
  { value: "DOCUMENT_SCREENING_PASS", label: "Document Screening Pass" },
  { value: "DOCUMENT_SCREENING_FAIL", label: "Document Screening Fail" },
  { value: "FIRST_INTERVIEW_SCHEDULED", label: "1st Interview Scheduled" },
  { value: "FIRST_INTERVIEW_PASS", label: "1st Interview Pass" },
  { value: "FIRST_INTERVIEW_FAIL", label: "1st Interview Fail" },
  { value: "SECOND_INTERVIEW_SCHEDULED", label: "2nd Interview Scheduled" },
  { value: "SECOND_INTERVIEW_PASS", label: "2nd Interview Pass" },
  { value: "SECOND_INTERVIEW_FAIL", label: "2nd Interview Fail" },
] as const;

export const JOB_CONDITIONS = [
  { value: "OK", label: "OK" },
  { value: "REJECT", label: "REJECT" },
] as const;

export type Caller = (typeof CALLERS)[number]["value"];
export type JobSite = (typeof JOB_SITES)[number]["value"];
export type JobStatus = (typeof JOB_STATUSES)[number]["value"];
export type JobCondition = (typeof JOB_CONDITIONS)[number]["value"];

/** Statuses that indicate the candidate did not meet hiring criteria */
export const FAILED_STATUSES: JobStatus[] = [
  "JOB_APPLICATION_FAILED",
  "CASUAL_INTERVIEW_FAIL",
  "DOCUMENT_SCREENING_FAIL",
  "FIRST_INTERVIEW_FAIL",
  "SECOND_INTERVIEW_FAIL",
];

/** Active hiring pipeline stages after the casual interview */
export const HIRING_STAGE_STATUSES: JobStatus[] = [
  "DOCUMENT_SCREENING_SUBMITTED",
  "DOCUMENT_SCREENING_PASS",
  "FIRST_INTERVIEW_SCHEDULED",
  "FIRST_INTERVIEW_PASS",
  "SECOND_INTERVIEW_SCHEDULED",
  "SECOND_INTERVIEW_PASS",
];

export type MeetingHighlight = "reject" | "hiring" | "default";

export function doesNotMeetCriteria(
  jobCondition: string,
  jobStatus: string
): boolean {
  return (
    jobCondition === "REJECT" ||
    FAILED_STATUSES.includes(jobStatus as JobStatus)
  );
}

export function isHiringStageAfterCasual(jobStatus: string): boolean {
  return HIRING_STAGE_STATUSES.includes(jobStatus as JobStatus);
}

export function getMeetingHighlight(
  jobCondition: string,
  jobStatus: string
): MeetingHighlight {
  if (doesNotMeetCriteria(jobCondition, jobStatus)) return "reject";
  if (isHiringStageAfterCasual(jobStatus)) return "hiring";
  return "default";
}

export function getMeetingHighlightClass(
  jobCondition: string,
  jobStatus: string
): string {
  const highlight = getMeetingHighlight(jobCondition, jobStatus);
  if (highlight === "reject") return "meeting-cell-reject";
  if (highlight === "hiring") return "meeting-cell-hiring";
  return "meeting-cell-default";
}

export function getMeetingRowClass(
  jobCondition: string,
  jobStatus: string
): string {
  const highlight = getMeetingHighlight(jobCondition, jobStatus);
  if (highlight === "reject") return "table-row-reject";
  if (highlight === "hiring") return "table-row-hiring";
  return "";
}

export const NOTIFICATION_LEAD_MINUTES = 15;
export const NOTIFICATION_POLL_INTERVAL_MS = 30_000;

export function getMeetingDateTime(meetingDate: string, meetingHour: number): Date {
  const [y, m, d] = meetingDate.split("-").map(Number);
  return new Date(y, m - 1, d, meetingHour, 0, 0, 0);
}

export function getMinutesUntilMeeting(
  meetingDate: string,
  meetingHour: number,
  now = new Date()
): number {
  const start = getMeetingDateTime(meetingDate, meetingHour);
  return (start.getTime() - now.getTime()) / (60 * 1000);
}

export function shouldNotifyMeeting(
  meetingDate: string,
  meetingHour: number,
  leadMinutes = NOTIFICATION_LEAD_MINUTES,
  now = new Date()
): boolean {
  const minutesUntil = getMinutesUntilMeeting(meetingDate, meetingHour, now);
  return minutesUntil > 0 && minutesUntil <= leadMinutes;
}

export function getNotificationStorageKey(meetingId: string): string {
  return `meeting-notification-dismissed:${meetingId}`;
}

export function formatHour(hour: number): string {
  if (hour === 12) return "12:00 PM";
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
}

export function getCallerLabel(caller: string): string {
  return CALLERS.find((c) => c.value === caller)?.label ?? caller;
}

export function getJobSiteLabel(jobSite: string): string {
  return JOB_SITES.find((s) => s.value === jobSite)?.label ?? jobSite;
}

export function getJobStatusLabel(status: string): string {
  return JOB_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function getJobConditionLabel(condition: string): string {
  return JOB_CONDITIONS.find((c) => c.value === condition)?.label ?? condition;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getWeekDates(anchor: Date): Date[] {
  const start = new Date(anchor);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function formatDateHeader(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
