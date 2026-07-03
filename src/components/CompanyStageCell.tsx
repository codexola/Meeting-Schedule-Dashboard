"use client";

import type { CompanyStage } from "@/lib/types";
import {
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  STAGE_OUTCOMES,
  formatTime,
  getStageOutcomeBadgeClass,
  getStageOutcomeLabel,
} from "@/lib/constants";

interface CompanyStageCellProps {
  stage: CompanyStage;
  companyId: string;
  saving: boolean;
  onUpdate: (
    companyId: string,
    stageKey: string,
    patch: Partial<CompanyStage>
  ) => void;
}

export default function CompanyStageCell({
  stage,
  companyId,
  saving,
  onUpdate,
}: CompanyStageCellProps) {
  const setOutcome = (outcome: string) => {
    onUpdate(companyId, stage.stage, { outcome });
  };

  return (
    <div className="company-stage-cell p-2 border rounded bg-white">
      <div className="mb-1">
        <span
          className={`badge stage-outcome-badge ${getStageOutcomeBadgeClass(stage.outcome)}`}
        >
          {getStageOutcomeLabel(stage.outcome)}
        </span>
      </div>

      <div className="d-flex flex-wrap gap-1 mb-2">
        {STAGE_OUTCOMES.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`btn btn-sm stage-outcome-btn ${stage.outcome === opt.value ? `active ${getStageOutcomeBadgeClass(opt.value)}` : "btn-outline-secondary"}`}
            disabled={saving}
            onClick={() => setOutcome(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="small mb-1">
        <input
          type="date"
          className="form-control form-control-sm"
          value={stage.scheduledDate ?? ""}
          disabled={saving}
          onChange={(e) =>
            onUpdate(companyId, stage.stage, {
              scheduledDate: e.target.value || null,
            })
          }
        />
      </div>

      <div className="d-flex gap-1 mb-1">
        <select
          className="form-select form-select-sm"
          value={stage.scheduledHour ?? ""}
          disabled={saving}
          onChange={(e) =>
            onUpdate(companyId, stage.stage, {
              scheduledHour: e.target.value ? Number(e.target.value) : null,
            })
          }
        >
          <option value="">Hr</option>
          {HOUR_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <select
          className="form-select form-select-sm"
          value={stage.scheduledMinute ?? 0}
          disabled={saving}
          onChange={(e) =>
            onUpdate(companyId, stage.stage, {
              scheduledMinute: Number(e.target.value),
            })
          }
        >
          {MINUTE_OPTIONS.filter((m) => m % 15 === 0).map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>

      {stage.scheduledDate &&
        stage.scheduledHour !== null &&
        stage.scheduledHour !== undefined && (
          <div className="small text-muted mb-1">
            {formatTime(stage.scheduledHour, stage.scheduledMinute ?? 0)}
          </div>
        )}

      <input
        type="url"
        className="form-control form-control-sm"
        placeholder="Meeting link"
        value={stage.meetingLink ?? ""}
        disabled={saving}
        onChange={(e) =>
          onUpdate(companyId, stage.stage, {
            meetingLink: e.target.value || null,
          })
        }
      />
      {stage.meetingLink && (
        <a
          href={stage.meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="small d-block mt-1 text-truncate"
        >
          Open link
        </a>
      )}
    </div>
  );
}
