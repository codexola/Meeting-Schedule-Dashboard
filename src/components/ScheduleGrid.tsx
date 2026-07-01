"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ColorLegend from "./ColorLegend";
import MeetingModal from "./MeetingModal";
import type { Meeting, MeetingFormData } from "@/lib/types";
import { emptyMeetingForm } from "@/lib/types";
import {
  TIME_SLOTS,
  formatDateHeader,
  formatHour,
  formatWeekRange,
  getCallerLabel,
  getJobSiteLabel,
  getMeetingHighlightClass,
  getWeekDates,
  parseDateKey,
  toDateKey,
} from "@/lib/constants";

function meetingToForm(meeting: Meeting): MeetingFormData {
  return {
    meetingDate: meeting.meetingDate,
    meetingHour: meeting.meetingHour,
    meetingLink: meeting.meetingLink ?? "",
    companyName: meeting.companyName,
    caller: meeting.caller ?? "",
    jobSiteName: meeting.jobSiteName ?? "",
    jobPositionLink: meeting.jobPositionLink ?? "",
    interviewer: meeting.interviewer ?? "",
    contactName: meeting.contactName ?? "",
    contactPosition: meeting.contactPosition ?? "",
    chatLink: meeting.chatLink ?? "",
    jobStatus: meeting.jobStatus,
    jobCondition: meeting.jobCondition,
  };
}

export default function ScheduleGrid() {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MeetingFormData>(
    emptyMeetingForm(toDateKey(new Date()), 9)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekAnchor), [weekAnchor]);
  const startDate = toDateKey(weekDates[0]);
  const endDate = toDateKey(weekDates[6]);

  const meetingMap = useMemo(() => {
    const map = new Map<string, Meeting>();
    for (const m of meetings) {
      map.set(`${m.meetingDate}-${m.meetingHour}`, m);
    }
    return map;
  }, [meetings]);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/meetings?startDate=${startDate}&endDate=${endDate}`
      );
      if (!res.ok) throw new Error("Failed to load meetings");
      const data: Meeting[] = await res.json();
      setMeetings(data);
    } catch {
      setError("Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const openCell = (dateKey: string, hour: number) => {
    const key = `${dateKey}-${hour}`;
    const existing = meetingMap.get(key);
    setError(null);
    if (existing) {
      setEditingId(existing.id);
      setForm(meetingToForm(existing));
    } else {
      setEditingId(null);
      setForm(emptyMeetingForm(dateKey, hour));
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const url = editingId ? `/api/meetings/${editingId}` : "/api/meetings";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      closeModal();
      await fetchMeetings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId || !confirm("Delete this meeting?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${editingId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      closeModal();
      await fetchMeetings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const shiftWeek = (delta: number) => {
    setWeekAnchor((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
        <div>
          <h2 className="h3 mb-1">Schedule</h2>
          <p className="text-muted mb-0 small">
            Click a cell to view or add a meeting (9 AM – 9 PM)
          </p>
          <p className="mb-0 mt-1 fw-semibold text-primary">
            <i className="bi bi-calendar3 me-1" />
            {formatWeekRange(weekDates[0], weekDates[6])}
          </p>
        </div>
        <div className="btn-group" role="group" aria-label="Week navigation">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => shiftWeek(-1)}
          >
            <i className="bi bi-chevron-left" /> Previous
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => setWeekAnchor(new Date())}
          >
            Today
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => shiftWeek(1)}
          >
            Next <i className="bi bi-chevron-right" />
          </button>
        </div>
      </div>

      <ColorLegend />

      {error && !modalOpen && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            <div className="spinner-border spinner-border-sm me-2" role="status" />
            Loading schedule...
          </div>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0 schedule-table small">
                <thead className="table-light">
                  <tr>
                    <th className="time-col">Time</th>
                    {weekDates.map((date) => {
                      const dateKey = toDateKey(date);
                      return (
                        <th key={dateKey} className="text-center">
                          <div>{formatDateHeader(date)}</div>
                          <div className="small text-muted fw-normal">
                            {dateKey}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((hour) => (
                    <tr key={hour}>
                      <td className="time-col fw-semibold text-secondary">
                        {formatHour(hour)}
                      </td>
                      {weekDates.map((date) => {
                        const dateKey = toDateKey(date);
                        const meeting = meetingMap.get(`${dateKey}-${hour}`);
                        return (
                          <td
                            key={`${dateKey}-${hour}`}
                            className="p-1"
                            onClick={() => openCell(dateKey, hour)}
                          >
                            {meeting ? (
                              <div
                                className={`schedule-cell p-2 ${getMeetingHighlightClass(meeting.jobCondition, meeting.jobStatus)}`}
                              >
                                <div className="fw-semibold text-truncate">
                                  {meeting.companyName}
                                </div>
                                <div className="text-truncate small text-muted">
                                  {formatDateHeader(parseDateKey(meeting.meetingDate))}{" "}
                                  {formatHour(meeting.meetingHour)}
                                </div>
                                {meeting.meetingLink && (
                                  <div className="text-truncate text-primary">
                                    <i className="bi bi-camera-video me-1" />
                                    Meeting
                                  </div>
                                )}
                                {meeting.caller && (
                                  <div className="text-truncate text-secondary">
                                    <i className="bi bi-telephone me-1" />
                                    {getCallerLabel(meeting.caller)}
                                  </div>
                                )}
                                {meeting.jobSiteName && (
                                  <div className="text-truncate text-secondary">
                                    <i className="bi bi-globe me-1" />
                                    {getJobSiteLabel(meeting.jobSiteName)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="schedule-cell-empty">
                                <i className="bi bi-plus-lg" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <MeetingModal
        isOpen={modalOpen}
        isEditing={!!editingId}
        form={form}
        saving={saving}
        error={error}
        onChange={setForm}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={editingId ? handleDelete : undefined}
      />
    </div>
  );
}
