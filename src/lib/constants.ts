export const HOUR_START = 9;
export const HOUR_END = 21;
export const SCHEDULE_MINUTE_STEP = 15;

export interface TimeSlot {
  hour: number;
  minute: number;
}

export const HOUR_OPTIONS = Array.from(
  { length: HOUR_END - HOUR_START + 1 },
  (_, i) => HOUR_START + i
);

export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);

function buildTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = HOUR_START; hour <= HOUR_END; hour++) {
    const minutes =
      hour === HOUR_END
        ? [0]
        : Array.from(
            { length: 60 / SCHEDULE_MINUTE_STEP },
            (_, i) => i * SCHEDULE_MINUTE_STEP
          );
    for (const minute of minutes) {
      slots.push({ hour, minute });
    }
  }
  return slots;
}

export const TIME_SLOTS: TimeSlot[] = buildTimeSlots();

export function meetingSlotKey(
  date: string,
  hour: number,
  minute: number
): string {
  return `${date}-${hour}-${minute}`;
}

export function formatTime(hour: number, minute = 0): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = String(minute).padStart(2, "0");
  return `${displayHour}:${displayMinute} ${period}`;
}

/** @deprecated Use formatTime(hour, minute) */
export function formatHour(hour: number): string {
  return formatTime(hour, 0);
}

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
  return "table-row-default";
}

export const NOTIFICATION_LEAD_MINUTES = 15;
export const NOTIFICATION_POLL_INTERVAL_MS = 30_000;

export function getMeetingDateTime(
  meetingDate: string,
  meetingHour: number,
  meetingMinute = 0
): Date {
  const [y, m, d] = meetingDate.split("-").map(Number);
  return new Date(y, m - 1, d, meetingHour, meetingMinute, 0, 0);
}

export function getMinutesUntilMeeting(
  meetingDate: string,
  meetingHour: number,
  meetingMinute = 0,
  now = new Date()
): number {
  const start = getMeetingDateTime(meetingDate, meetingHour, meetingMinute);
  return (start.getTime() - now.getTime()) / (60 * 1000);
}

export function shouldNotifyMeeting(
  meetingDate: string,
  meetingHour: number,
  meetingMinute = 0,
  leadMinutes = NOTIFICATION_LEAD_MINUTES,
  now = new Date()
): boolean {
  const minutesUntil = getMinutesUntilMeeting(
    meetingDate,
    meetingHour,
    meetingMinute,
    now
  );
  return minutesUntil > 0 && minutesUntil <= leadMinutes;
}

export function getNotificationStorageKey(meetingId: string): string {
  return `meeting-notification-dismissed:${meetingId}`;
}

export function getCallerLabel(caller: string): string {
  return CALLERS.find((c) => c.value === caller)?.label ?? caller;
}

export function getJobSiteLabel(jobSite: string): string {
  const preset = JOB_SITES.find(
    (s) => s.value === jobSite || s.label === jobSite
  );
  return preset?.label ?? jobSite;
}

export function normalizeJobSiteName(value: string): string {
  return value.trim();
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

/** Convert a Prisma @db.Date value to YYYY-MM-DD without timezone shift */
export function dateKeyFromDbDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function formatDateLong(key: string): string {
  return parseDateKey(key).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatWeekRange(start: Date, end: Date): string {
  const startLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const endLabel = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function isPresetJobSite(value: string): boolean {
  return JOB_SITES.some((site) => site.value === value || site.label === value);
}

export function getJobSitePresetValue(value: string): string {
  const preset = JOB_SITES.find((s) => s.value === value || s.label === value);
  return preset?.value ?? value;
}

export const SCHEDULE_HALF_HOUR_MINUTES = 30;

export function getScheduleHalfHourBand(hour: number, minute: number): 0 | 1 {
  const minutesSinceStart = (hour - HOUR_START) * 60 + minute;
  return (Math.floor(minutesSinceStart / SCHEDULE_HALF_HOUR_MINUTES) %
    2) as 0 | 1;
}

export function getScheduleDayColumnClass(dayIndex: number): string {
  return `schedule-day-col-${dayIndex}`;
}

export function getScheduleTimeBandClass(hour: number, minute: number): string {
  return `schedule-time-band-${getScheduleHalfHourBand(hour, minute)}`;
}

/** @deprecated Use getScheduleDayColumnClass + getScheduleTimeBandClass on row/cell */
export function getScheduleCellStripeClass(
  dayIndex: number,
  hour: number,
  minute: number
): string {
  return `${getScheduleDayColumnClass(dayIndex)} ${getScheduleTimeBandClass(hour, minute)}`;
}

export function getScheduleDayHeaderClass(dayIndex: number): string {
  return `schedule-day-header-${dayIndex}`;
}

export function isScheduleHalfHourBoundary(minute: number): boolean {
  return minute === 0 || minute === 30;
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
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
