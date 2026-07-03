"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SearchResults } from "@/lib/types";
import {
  formatDateHeader,
  formatTime,
  getCallerLabel,
  getJobSiteLabel,
  getJobStatusLabel,
  parseDateKey,
} from "@/lib/constants";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error("Search failed");
      const data: SearchResults = await res.json();
      setResults(data);
    } catch {
      setResults({ query: trimmed, companies: [], meetings: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) runSearch(query);
      else setResults(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasResults =
    results &&
    (results.companies.length > 0 || results.meetings.length > 0);

  return (
    <div className="global-search position-relative" ref={wrapRef}>
      <div className="input-group input-group-sm">
        <span className="input-group-text bg-white border-end-0">
          <i className="bi bi-search" />
        </span>
        <input
          type="search"
          className="form-control border-start-0"
          placeholder="Search companies, meetings..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-label="Global search"
          style={{ minWidth: 220 }}
        />
      </div>

      {open && query.trim() && (
        <div className="global-search-dropdown card shadow">
          <div className="card-body p-2">
            {loading ? (
              <div className="text-muted small py-2 px-1">Searching...</div>
            ) : !hasResults ? (
              <div className="text-muted small py-2 px-1">
                No results for &quot;{query.trim()}&quot;
              </div>
            ) : (
              <>
                {results!.companies.length > 0 && (
                  <div className="mb-2">
                    <div className="small fw-semibold text-secondary px-1 mb-1">
                      Companies
                    </div>
                    {results!.companies.map((company) => (
                      <Link
                        key={company.id}
                        href="/discussions"
                        className="global-search-item d-block px-2 py-1 rounded text-decoration-none"
                        onClick={() => setOpen(false)}
                      >
                        <div className="fw-semibold">{company.name}</div>
                        <small className="text-muted">
                          {company.meetingCount} meeting
                          {company.meetingCount !== 1 ? "s" : ""}
                          {company.jobSiteName
                            ? ` · ${getJobSiteLabel(company.jobSiteName)}`
                            : ""}
                        </small>
                      </Link>
                    ))}
                  </div>
                )}
                {results!.meetings.length > 0 && (
                  <div>
                    <div className="small fw-semibold text-secondary px-1 mb-1">
                      Meetings
                    </div>
                    {results!.meetings.map((meeting) => (
                      <Link
                        key={meeting.id}
                        href="/schedule"
                        className="global-search-item d-block px-2 py-1 rounded text-decoration-none"
                        onClick={() => setOpen(false)}
                      >
                        <div className="fw-semibold">{meeting.companyName}</div>
                        <small className="text-muted">
                          {formatDateHeader(
                            parseDateKey(meeting.meetingDate)
                          )}{" "}
                          {formatTime(
                            meeting.meetingHour,
                            meeting.meetingMinute ?? 0
                          )}
                          {meeting.caller
                            ? ` · ${getCallerLabel(meeting.caller)}`
                            : ""}
                          {" · "}
                          {getJobStatusLabel(meeting.jobStatus)}
                        </small>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
