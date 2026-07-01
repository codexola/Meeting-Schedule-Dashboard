"use client";

import { useEffect, useMemo } from "react";
import type { MeetingFormData } from "@/lib/types";
import {
  CALLERS,
  CUSTOM_JOB_SITE_VALUE,
  JOB_CONDITIONS,
  JOB_SITES,
  JOB_STATUSES,
  TIME_SLOTS,
  formatDateLong,
  formatHour,
  isPresetJobSite,
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
  const jobSiteSelectValue = useMemo(() => {
    if (!form.jobSiteName) return "";
    if (isPresetJobSite(form.jobSiteName)) return form.jobSiteName;
    return CUSTOM_JOB_SITE_VALUE;
  }, [form.jobSiteName]);

  const showCustomJobSite = jobSiteSelectValue === CUSTOM_JOB_SITE_VALUE;

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

  const slotLabel = `${formatDateLong(form.meetingDate)} at ${formatHour(form.meetingHour)}`;

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

                <div className="col-md-6">
                  <label className="form-label">Meeting Time</label>
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
                    {TIME_SLOTS.map((hour) => (
                      <option key={hour} value={hour}>
                        {formatHour(hour)}
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

                <div className="col-md-6">
                  <label className="form-label">Job Site</label>
                  <select
                    className="form-select"
                    value={jobSiteSelectValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === CUSTOM_JOB_SITE_VALUE) {
                        onChange({
                          ...form,
                          jobSiteName: isPresetJobSite(form.jobSiteName)
                            ? ""
                            : form.jobSiteName,
                        });
                        return;
                      }
                      onChange({ ...form, jobSiteName: value });
                    }}
                  >
                    <option value="">Select job site</option>
                    {JOB_SITES.map((site) => (
                      <option key={site.value} value={site.value}>
                        {site.label}
                      </option>
                    ))}
                    <option value={CUSTOM_JOB_SITE_VALUE}>Other (add custom)</option>
                  </select>
                </div>

                {showCustomJobSite && (
                  <div className="col-md-6">
                    <label className="form-label">Custom Job Site</label>
                    <input
                      className="form-control"
                      value={form.jobSiteName}
                      onChange={(e) =>
                        onChange({ ...form, jobSiteName: e.target.value })
                      }
                      placeholder="Enter job site name"
                    />
                  </div>
                )}

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
