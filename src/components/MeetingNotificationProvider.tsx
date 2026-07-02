"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Meeting } from "@/lib/types";
import {
  formatDateHeader,
  formatTime,
  getCallerLabel,
  getJobSiteLabel,
  getMinutesUntilMeeting,
  getNotificationStorageKey,
  NOTIFICATION_LEAD_MINUTES,
  NOTIFICATION_POLL_INTERVAL_MS,
  parseDateKey,
} from "@/lib/constants";

function isDismissed(meetingId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getNotificationStorageKey(meetingId)) === "1";
}

function dismissNotification(meetingId: string) {
  localStorage.setItem(getNotificationStorageKey(meetingId), "1");
}

function formatMinutesUntil(minutes: number): string {
  const rounded = Math.max(1, Math.round(minutes));
  return `${rounded} minute${rounded === 1 ? "" : "s"}`;
}

function showDesktopNotification(meeting: Meeting, minutesUntil: number) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const body = [
    `Starts in ${formatMinutesUntil(minutesUntil)}`,
    meeting.caller ? `Caller: ${getCallerLabel(meeting.caller)}` : null,
    meeting.jobSiteName ? `Job site: ${getJobSiteLabel(meeting.jobSiteName)}` : null,
    meeting.interviewer ? `Interviewer: ${meeting.interviewer}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  new Notification(`Meeting soon: ${meeting.companyName}`, {
    body,
    tag: `meeting-${meeting.id}`,
    requireInteraction: true,
  });
}

function NotificationCard({
  meeting,
  onClose,
}: {
  meeting: Meeting;
  onClose: (id: string) => void;
}) {
  const minutesUntil = getMinutesUntilMeeting(
    meeting.meetingDate,
    meeting.meetingHour,
    meeting.meetingMinute ?? 0
  );

  return (
    <div className="desktop-notification-card shadow-lg" role="alert">
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <i className="bi bi-alarm text-warning" />
            <strong>Meeting in {formatMinutesUntil(minutesUntil)}</strong>
          </div>
          <h6 className="mb-1">{meeting.companyName}</h6>
          <div className="small text-secondary">
            {formatDateHeader(parseDateKey(meeting.meetingDate))} at{" "}
            {formatTime(meeting.meetingHour, meeting.meetingMinute ?? 0)}
          </div>
        </div>
        <button
          type="button"
          className="btn-close"
          aria-label="Close notification"
          onClick={() => onClose(meeting.id)}
        />
      </div>

      <div className="small mt-2">
        {meeting.caller && (
          <div>
            <i className="bi bi-telephone me-1" />
            {getCallerLabel(meeting.caller)}
          </div>
        )}
        {meeting.jobSiteName && (
          <div>
            <i className="bi bi-globe me-1" />
            {getJobSiteLabel(meeting.jobSiteName)}
          </div>
        )}
        {meeting.interviewer && (
          <div>
            <i className="bi bi-person me-1" />
            {meeting.interviewer}
          </div>
        )}
      </div>

      <div className="d-flex flex-wrap gap-2 mt-3">
        {meeting.meetingLink && (
          <a
            href={meeting.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
          >
            <i className="bi bi-camera-video me-1" />
            Join meeting
          </a>
        )}
        {meeting.jobPositionLink && (
          <a
            href={meeting.jobPositionLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-secondary btn-sm"
          >
            View position
          </a>
        )}
      </div>
    </div>
  );
}

export default function MeetingNotificationProvider() {
  const [notifications, setNotifications] = useState<Meeting[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const desktopShownRef = useRef<Set<string>>(new Set());

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/meetings/upcoming?leadMinutes=${NOTIFICATION_LEAD_MINUTES}`
      );
      if (!res.ok) return;

      const data = await res.json();
      const meetings: Meeting[] = data.meetings ?? [];
      const visible = meetings.filter((meeting) => !isDismissed(meeting.id));

      setNotifications(visible);

      for (const meeting of visible) {
        if (desktopShownRef.current.has(meeting.id)) continue;
        const minutesUntil = getMinutesUntilMeeting(
          meeting.meetingDate,
          meeting.meetingHour,
          meeting.meetingMinute ?? 0
        );
        showDesktopNotification(meeting, minutesUntil);
        desktopShownRef.current.add(meeting.id);
      }
    } catch {
      // Keep existing notifications visible if polling fails temporarily.
    }
  }, []);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    refreshNotifications();
    const intervalId = window.setInterval(
      refreshNotifications,
      NOTIFICATION_POLL_INTERVAL_MS
    );

    return () => window.clearInterval(intervalId);
  }, [refreshNotifications]);

  const handleClose = (meetingId: string) => {
    dismissNotification(meetingId);
    setNotifications((current) => current.filter((item) => item.id !== meetingId));
  };

  return (
    <>
      {permission === "default" && (
        <div className="notification-permission-banner shadow">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="small">
              <i className="bi bi-bell me-1" />
              Enable desktop alerts for meetings starting in{" "}
              {NOTIFICATION_LEAD_MINUTES} minutes.
            </span>
            <button
              type="button"
              className="btn btn-warning btn-sm"
              onClick={requestPermission}
            >
              Enable notifications
            </button>
          </div>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="desktop-notification-stack" aria-live="polite">
          {notifications.map((meeting) => (
            <NotificationCard
              key={meeting.id}
              meeting={meeting}
              onClose={handleClose}
            />
          ))}
        </div>
      )}
    </>
  );
}
