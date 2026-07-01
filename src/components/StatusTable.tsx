"use client";

import { useCallback, useEffect, useState } from "react";
import ColorLegend from "./ColorLegend";
import type { Meeting } from "@/lib/types";
import {
  formatDateHeader,
  formatHour,
  getCallerLabel,
  getJobSiteLabel,
  getJobStatusLabel,
  getMeetingRowClass,
  parseDateKey,
} from "@/lib/constants";

function LinkCell({
  href,
  label,
}: {
  href: string | null;
  label: string;
}) {
  if (!href) {
    return <span className="text-muted">—</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="link-primary"
    >
      {label}
    </a>
  );
}

export default function StatusTable() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meetings?jobCondition=OK");
      if (!res.ok) throw new Error("Failed to load status data");
      const data: Meeting[] = await res.json();
      setMeetings(data);
    } catch {
      setError("Failed to load job status data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
        <div>
          <h2 className="h3 mb-1">Status</h2>
          <p className="text-muted mb-0 small">
            Active job positions with OK condition only
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={fetchMeetings}
        >
          <i className="bi bi-arrow-clockwise me-1" />
          Refresh
        </button>
      </div>

      <ColorLegend />

      {loading ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            <div className="spinner-border spinner-border-sm me-2" role="status" />
            Loading status...
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : meetings.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            No job positions with OK condition found.
          </div>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0 status-table small">
                <thead className="table-light">
                  <tr>
                    <th className="sticky-col">Job Position</th>
                    <th>Caller</th>
                    <th>Job Site</th>
                    <th>Meeting Link</th>
                    <th>Job Position</th>
                    <th>Scheduled</th>
                    <th>Interviewer</th>
                    <th>Contact</th>
                    <th>Chat</th>
                    <th>Job Status</th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.map((meeting) => (
                    <tr
                      key={meeting.id}
                      className={getMeetingRowClass(
                        meeting.jobCondition,
                        meeting.jobStatus
                      )}
                    >
                      <td className="sticky-col fw-semibold">
                        <div>{meeting.companyName}</div>
                        {meeting.jobSiteName && (
                          <small className="text-muted">
                            via {getJobSiteLabel(meeting.jobSiteName)}
                          </small>
                        )}
                      </td>
                      <td>
                        {meeting.caller ? getCallerLabel(meeting.caller) : "—"}
                      </td>
                      <td>
                        {meeting.jobSiteName
                          ? getJobSiteLabel(meeting.jobSiteName)
                          : "—"}
                      </td>
                      <td>
                        <LinkCell
                          href={meeting.meetingLink}
                          label="Open meeting"
                        />
                      </td>
                      <td>
                        <LinkCell
                          href={meeting.jobPositionLink}
                          label="View position"
                        />
                      </td>
                      <td>
                        {formatDateHeader(parseDateKey(meeting.meetingDate))}{" "}
                        {formatHour(meeting.meetingHour)}
                      </td>
                      <td>{meeting.interviewer || "—"}</td>
                      <td>
                        {meeting.contactName ? (
                          <>
                            <div>{meeting.contactName}</div>
                            {meeting.contactPosition && (
                              <small className="text-muted">
                                {meeting.contactPosition}
                              </small>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <LinkCell href={meeting.chatLink} label="Open chat" />
                      </td>
                      <td>
                        <span className="badge text-bg-secondary">
                          {getJobStatusLabel(meeting.jobStatus)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
