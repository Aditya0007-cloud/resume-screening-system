"use client";

import { CheckCircle2, CircleAlert, MinusCircle, Sparkles } from "lucide-react";
import type { CandidateResult } from "@/lib/api";

type Props = {
  candidate: CandidateResult;
  active: boolean;
  onSelect: () => void;
};

const decisionStyles = {
  Selected: "border-mint bg-emerald-50 text-mint",
  Maybe: "border-warning bg-amber-50 text-warning",
  Rejected: "border-danger bg-red-50 text-danger",
};

const decisionIcons = {
  Selected: CheckCircle2,
  Maybe: CircleAlert,
  Rejected: MinusCircle,
};

export function CandidateCard({ candidate, active, onSelect }: Props) {
  const Icon = decisionIcons[candidate.decision];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`focus-ring w-full border bg-white p-4 text-left shadow-sm transition ${
        active ? "border-accent ring-2 ring-accent/20" : "border-line hover:border-accent/50"
      }`}
      style={{ borderRadius: 8 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink">{candidate.name}</h3>
          <p className="truncate text-sm text-slate-500">{candidate.filename}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold text-ink">{Math.round(candidate.score)}</div>
          <div className="text-xs uppercase tracking-wide text-slate-500">score</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 border px-2 py-1 text-xs font-medium ${decisionStyles[candidate.decision]}`}
          style={{ borderRadius: 6 }}
        >
          <Icon size={14} aria-hidden />
          {candidate.decision}
        </span>
        {candidate.llm_score !== null && (
          <span className="inline-flex items-center gap-1 border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-accent" style={{ borderRadius: 6 }}>
            <Sparkles size={14} aria-hidden />
            AI {Math.round(candidate.llm_score)}
          </span>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{candidate.summary}</p>
    </button>
  );
}
