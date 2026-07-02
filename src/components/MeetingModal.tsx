"use client";

import { useEffect } from "react";
import type { MeetingFormData } from "@/lib/types";
import {
  CALLERS,
  HOUR_OPTIONS,
  JOB_CONDITIONS,
  JOB_SITES,
  JOB_STATUSES,
  MINUTE_OPTIONS,
  formatDateLong,
  formatTime,
  getJobSiteLabel,
} from "@/lib/constants";

interface MeetingModalProps {
  isOpen: boolean;
  isEditing: boolean;
  form: MeetingFormData;
  saving: boolean;
  error: string | null;
  onChange: (form: MeetingFormData) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

export default function MeetingModal({
  isOpen,
  isEditing,
  form,
  saving,
  error,
  onChange,
  onClose,
  onSave,
  onDelete,
}: MeetingModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const slotLabel = `${formatDateLong(form.meetingDate)} at ${formatTime(form.meetingHour, form.meetingMinute)}`;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="modal-dialog modal-lg modal-dialog-scrollable"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h5 className="modal-title mb-0">
                  {isEditing ? "Edit Meeting" : "New Meeting"}
                </h5>
                <small className="text-muted">{slotLabel}</small>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              />
            </div>

            <div className="modal-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Meeting Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.meetingDate}
                    onChange={(e) =>
                      onChange({ ...form, meetingDate: e.target.value })
                    }
                  />
                  <div className="form-text">{formatDateLong(form.meetingDate)}</div>
                </div>

                <div className="col-md-3">
                  <label className="form-label">Hour</label>
                  <select
                    className="form-select"
                    value={form.meetingHour}
                    onChange={(e) =>
                      onChange({
                        ...form,
                        meetingHour: Number(e.target.value),
                      })
                    }
                  >
                    {HOUR_OPTIONS.map((hour) => (
                      <option key={hour} value={hour}>
                        {formatTime(hour, 0).replace(":00", "")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label">Minute</label>
                  <select
                    className="form-select"
                    value={form.meetingMinute}
                    onChange={(e) =>
                      onChange({
                        ...form,
                        meetingMinute: Number(e.target.value),
                      })
                    }
                  >
                    {MINUTE_OPTIONS.map((minute) => (
                      <option key={minute} value={minute}>
                        {String(minute).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Company Name *</label>
                  <input
                    className="form-control"
                    value={form.companyName}
                    onChange={(e) =>
                      onChange({ ...form, companyName: e.target.value })
                    }
                    placeholder="e.g. Acme Corp"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Caller</label>
                  <select
                    className="form-select"
                    value={form.caller}
                    onChange={(e) =>
                      onChange({ ...form, caller: e.target.value })
                    }
                  >
                    <option value="">Select caller</option>
                    {CALLERS.map((caller) => (
                      <option key={caller.value} value={caller.value}>
                        {caller.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label">Job Site</label>
                  <div className="row g-2">
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        defaultValue=""
                        onChange={(e) => {
                          const site = JOB_SITES.find(
                            (item) => item.value === e.target.value
                          );
                          if (site) {
                            onChange({ ...form, jobSiteName: site.label });
                          }
                          e.target.value = "";
                        }}
                      >
                        <option value="">Quick select preset...</option>
                        {JOB_SITES.map((site) => (
                          <option key={site.value} value={site.value}>
                            {site.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-8">
                      <input
                        className="form-control"
                        list="job-site-suggestions"
                        value={form.jobSiteName}
                        onChange={(e) =>
                          onChange({ ...form, jobSiteName: e.target.value })
                        }
                        placeholder="Type or select a job site (e.g. LinkedIn, Indeed)"
                      />
                      <datalist id="job-site-suggestions">
                        {JOB_SITES.map((site) => (
                          <option key={site.value} value={site.label} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div className="form-text">
                    Choose a preset or enter any new job site name.
                    {form.jobSiteName
                      ? ` Selected: ${getJobSiteLabel(form.jobSiteName)}`
                      : ""}
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label">Meeting Link</label>
                  <input
                    className="form-control"
                    type="url"
                    value={form.meetingLink}
                    onChange={(e) =>
                      onChange({ ...form, meetingLink: e.target.value })
                    }
                    placeholder="https://meet.google.com/..."
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Job Position Link</label>
                  <input
                    className="form-control"
                    type="url"
                    value={form.jobPositionLink}
                    onChange={(e) =>
                      onChange({ ...form, jobPositionLink: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Interviewer</label>
                  <input
                    className="form-control"
                    value={form.interviewer}
                    onChange={(e) =>
                      onChange({ ...form, interviewer: e.target.value })
                    }
                    placeholder="Interviewer name"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Chat Link</label>
                  <input
                    className="form-control"
                    type="url"
                    value={form.chatLink}
                    onChange={(e) =>
                      onChange({ ...form, chatLink: e.target.value })
                    }
                    placeholder="Slack, LINE, etc."
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Contact Person Name</label>
                  <input
                    className="form-control"
                    value={form.contactName}
                    onChange={(e) =>
                      onChange({ ...form, contactName: e.target.value })
                    }
                    placeholder="Current contact name"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Contact Person Position</label>
                  <input
                    className="form-control"
                    value={form.contactPosition}
                    onChange={(e) =>
                      onChange({ ...form, contactPosition: e.target.value })
                    }
                    placeholder="e.g. HR Manager"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Job Status</label>
                  <select
                    className="form-select"
                    value={form.jobStatus}
                    onChange={(e) =>
                      onChange({ ...form, jobStatus: e.target.value })
                    }
                  >
                    {JOB_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Job Condition</label>
                  <select
                    className="form-select"
                    value={form.jobCondition}
                    onChange={(e) =>
                      onChange({ ...form, jobCondition: e.target.value })
                    }
                  >
                    {JOB_CONDITIONS.map((condition) => (
                      <option key={condition.value} value={condition.value}>
                        {condition.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer justify-content-between">
              <div>
                {isEditing && onDelete && (
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={onDelete}
                    disabled={saving}
                  >
                    <i className="bi bi-trash me-1" />
                    Delete
                  </button>
                )}
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        role="status"
                      />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show modal-backdrop-custom" />
    </>
  );
}
