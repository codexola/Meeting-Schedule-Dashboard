"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import CompanyStageCell from "./CompanyStageCell";
import type { Company, CompanyStage } from "@/lib/types";
import {
  PIPELINE_STAGES,
  formatDateHeader,
  formatTime,
  getCallerLabel,
  getCompanyDiscussionRowClass,
  getJobSiteLabel,
  parseDateKey,
} from "@/lib/constants";

function countPassedStages(stages: CompanyStage[]): number {
  return stages.filter((s) => s.outcome === "PASS").length;
}

export default function CompanyDiscussionsTable() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filter.trim()
        ? `/api/companies?q=${encodeURIComponent(filter.trim())}`
        : "/api/companies";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load companies");
      const data: Company[] = await res.json();
      setCompanies(data.filter((c) => c.meetingCount > 0));
    } catch {
      setError("Failed to load company discussions");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleStageUpdate = async (
    companyId: string,
    stageKey: string,
    patch: Partial<CompanyStage>
  ) => {
    const key = `${companyId}-${stageKey}`;
    setSavingKey(key);
    setError(null);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/stages/${stageKey}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? data : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update stage");
    } finally {
      setSavingKey(null);
    }
  };

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies]
  );

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
        <div>
          <h2 className="h3 mb-1">Company Discussions</h2>
          <p className="text-muted mb-0 small">
            Companies listed here are loaded from Schedule meetings (single
            database). Stage changes update the linked schedule meeting.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <input
            type="search"
            className="form-control form-control-sm"
            placeholder="Filter companies..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ minWidth: 200 }}
          />
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={fetchCompanies}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            <div className="spinner-border spinner-border-sm me-2" role="status" />
            Loading companies...
          </div>
        </div>
      ) : sortedCompanies.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-3">
              No companies with scheduled meetings. Add a meeting on the{" "}
              <Link href="/schedule">Schedule</Link> page first.
            </p>
          </div>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive discussions-table-wrap">
              <table className="table table-bordered mb-0 discussions-table small">
                <thead className="table-light">
                  <tr>
                    <th className="discussions-company-col sticky-discussions-col">
                      Company
                    </th>
                    <th>Schedule</th>
                    <th>Caller</th>
                    <th>Job Site</th>
                    <th>Stages Done</th>
                    {PIPELINE_STAGES.map((s) => (
                      <th key={s.value} className="discussions-stage-col text-center">
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedCompanies.map((company) => {
                    const rowClass = getCompanyDiscussionRowClass(
                      company.jobCondition,
                      company.stages
                    );
                    const latest = company.latestMeeting;
                    return (
                      <tr key={company.id}>
                        <td className={`sticky-discussions-col fw-semibold ${rowClass}`}>
                          <div>{company.name}</div>
                          {company.contactName && (
                            <small className="d-block opacity-75">
                              {company.contactName}
                              {company.contactPosition
                                ? ` · ${company.contactPosition}`
                                : ""}
                            </small>
                          )}
                        </td>
                        <td>
                          {latest ? (
                            <>
                              <div>
                                {formatDateHeader(
                                  parseDateKey(latest.meetingDate)
                                )}
                              </div>
                              <div>
                                {formatTime(
                                  latest.meetingHour,
                                  latest.meetingMinute
                                )}
                              </div>
                              <Link
                                href="/schedule"
                                className="small"
                              >
                                View on schedule
                              </Link>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          {company.caller
                            ? getCallerLabel(company.caller)
                            : "—"}
                        </td>
                        <td>
                          {company.jobSiteName
                            ? getJobSiteLabel(company.jobSiteName)
                            : "—"}
                        </td>
                        <td className="text-center">
                          <span className="badge text-bg-secondary">
                            {countPassedStages(company.stages)} /{" "}
                            {PIPELINE_STAGES.length}
                          </span>
                        </td>
                        {company.stages.map((stage) => (
                          <td key={stage.stage} className="p-1">
                            <CompanyStageCell
                              stage={stage}
                              companyId={company.id}
                              saving={savingKey === `${company.id}-${stage.stage}`}
                              onUpdate={handleStageUpdate}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
