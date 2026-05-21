"use client";

import { CheckCircle2, CircleAlert, MinusCircle, Sparkles, Trophy } from "lucide-react";
import type { CandidateResult } from "@/lib/api";

type Props = {
  candidate: CandidateResult;
  active: boolean;
  rank: number;
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

export function CandidateCard({ candidate, active, rank, onSelect }: Props) {
  const Icon = decisionIcons[candidate.decision];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`focus-ring w-full border bg-white/85 p-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md ${
        active ? "border-accent ring-2 ring-accent/20" : "border-line hover:border-accent/50"
      }`}
      style={{ borderRadius: 8 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {rank === 1 ? <Trophy size={16} className="text-amber-500" aria-hidden /> : <span className="text-xs font-semibold text-slate-400">#{rank}</span>}
            <h3 className="truncate text-base font-semibold text-ink">{candidate.name}</h3>
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">{candidate.filename}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold text-ink">{Math.round(candidate.score)}</div>
          <div className="text-xs uppercase tracking-wide text-slate-500">ATS</div>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden bg-slate-100" style={{ borderRadius: 999 }}>
        <div className="h-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, candidate.score))}%` }} />
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

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[...candidate.technical_skills, ...candidate.tools].slice(0, 5).map((skill) => (
          <span key={skill} className="bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600" style={{ borderRadius: 999 }}>
            {skill}
          </span>
        ))}
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{candidate.summary}</p>
    </button>
  );
}
