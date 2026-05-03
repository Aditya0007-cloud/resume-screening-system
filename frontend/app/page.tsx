"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  FileText,
  Filter,
  Loader2,
  Mail,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import {
  AdminStats,
  analyze,
  AnalyzeResponse,
  CandidateResult,
  downloadResultsCsv,
  getAdminStats,
  sendShortlistEmail,
  uploadResumes,
  UploadedResume,
} from "@/lib/api";
import { CandidateCard } from "@/components/CandidateCard";

const sampleJobDescription = `Senior Full-Stack AI Engineer

We are hiring a senior engineer to build production AI applications for resume screening and ranking.

Required skills:
- Python, FastAPI, React, TypeScript, SQL, SQLite or PostgreSQL
- Machine learning, NLP, LLM evaluation, OpenAI API
- REST API design, testing, Docker, Git
- 4+ years experience shipping production software

Preferred skills:
- scikit-learn, pandas, RAG, system design, AWS, stakeholder management

Responsibilities:
- Parse PDF and DOCX resumes, analyze job descriptions, rank candidates, and explain decisions.
- Collaborate with recruiters and product teams to improve screening quality.`;

const decisions = ["All", "Selected", "Maybe", "Rejected"] as const;

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<UploadedResume[]>([]);
  const [jobDescription, setJobDescription] = useState(sampleJobDescription);
  const [useLlm, setUseLlm] = useState(true);
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("recruiting@example.com");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState<(typeof decisions)[number]>("All");
  const [loading, setLoading] = useState<"upload" | "analyze" | "csv" | "email" | "stats" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = useMemo(() => {
    if (!results?.results.length) return null;
    return results.results.find((item) => item.id === selectedId) || results.results[0];
  }, [results, selectedId]);

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (results?.results || []).filter((candidate) => {
      const matchesDecision = decision === "All" || candidate.decision === decision;
      const matchesSearch =
        !query ||
        candidate.name.toLowerCase().includes(query) ||
        candidate.filename.toLowerCase().includes(query) ||
        candidate.skills_matched.join(" ").toLowerCase().includes(query);
      return matchesDecision && matchesSearch;
    });
  }, [results, search, decision]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files || []));
  }

  async function handleUpload() {
    if (!files.length) {
      setError("Choose at least one PDF or DOCX resume.");
      return;
    }
    setError("");
    setNotice("");
    setLoading("upload");
    try {
      const response = await uploadResumes(files, adminToken);
      setUploaded(response);
      await refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(null);
    }
  }

  async function handleAnalyze() {
    setError("");
    setNotice("");
    setLoading("analyze");
    try {
      const response = await analyze(jobDescription, useLlm, adminToken);
      setResults(response);
      setSelectedId(response.results[0]?.id ?? null);
      await refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(null);
    }
  }

  async function handleCsvDownload() {
    setError("");
    setNotice("");
    setLoading("csv");
    try {
      await downloadResultsCsv(adminToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV export failed.");
    } finally {
      setLoading(null);
    }
  }

  async function handleEmailShortlist() {
    setError("");
    setNotice("");
    setLoading("email");
    try {
      const response = await sendShortlistEmail(emailRecipient, results?.run_id ?? null, adminToken);
      setNotice(`${response.message} Candidates: ${response.candidates.join(", ")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shortlist email failed.");
    } finally {
      setLoading(null);
    }
  }

  async function refreshStats() {
    try {
      const response = await getAdminStats(adminToken);
      setStats(response);
    } catch {
      setStats(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef1f5]">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink">AI Resume Screening</h1>
            <p className="mt-1 text-sm text-slate-600">Batch-rank candidates against a role with explainable scoring.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCsvDownload}
              disabled={!results || loading !== null}
              className={`focus-ring inline-flex h-10 items-center gap-2 border px-3 text-sm font-medium ${
                results ? "border-line bg-white text-ink hover:border-accent" : "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
              }`}
              style={{ borderRadius: 8 }}
            >
              {loading === "csv" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <ArrowDownToLine size={17} aria-hidden />}
              CSV
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading !== null}
              className="focus-ring inline-flex h-10 items-center gap-2 bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60"
              style={{ borderRadius: 8 }}
            >
              {loading === "analyze" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <SlidersHorizontal size={17} aria-hidden />}
              Analyze
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[390px_minmax(0,1fr)]">
        <section className="space-y-5">
          <div className="border border-line bg-white p-4 shadow-sm" style={{ borderRadius: 8 }}>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck size={18} className="text-accent" aria-hidden />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Admin</h2>
            </div>
            <input
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="Admin token"
              type="password"
              className="focus-ring h-10 w-full border border-line px-3 text-sm"
              style={{ borderRadius: 8 }}
            />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Metric label="Resumes" value={(stats?.resumes ?? uploaded.length).toString()} />
              <Metric label="Runs" value={(stats?.screening_runs ?? results?.run_id ?? 0).toString()} />
              <Metric label="Selected" value={(stats?.selected ?? results?.results.filter((item) => item.decision === "Selected").length ?? 0).toString()} />
            </div>
            <button
              type="button"
              onClick={async () => {
                setLoading("stats");
                await refreshStats();
                setLoading(null);
              }}
              disabled={loading !== null}
              className="focus-ring mt-3 inline-flex h-10 w-full items-center justify-center gap-2 border border-line bg-white text-sm font-semibold text-ink hover:border-accent disabled:opacity-60"
              style={{ borderRadius: 8 }}
            >
              {loading === "stats" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <ShieldCheck size={17} aria-hidden />}
              Refresh stats
            </button>
          </div>

          <div className="border border-line bg-white p-4 shadow-sm" style={{ borderRadius: 8 }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Resumes</h2>
              <span className="text-sm text-slate-500">{uploaded.length ? `${uploaded.length} uploaded` : "PDF or DOCX"}</span>
            </div>
            <label className="focus-ring flex min-h-28 cursor-pointer flex-col items-center justify-center border border-dashed border-slate-300 bg-panel px-4 py-5 text-center" style={{ borderRadius: 8 }}>
              <Upload size={24} className="text-accent" aria-hidden />
              <span className="mt-2 text-sm font-medium text-ink">{files.length ? `${files.length} file(s) selected` : "Choose resumes"}</span>
              <span className="mt-1 text-xs text-slate-500">Batch upload is supported</span>
              <input className="sr-only" type="file" multiple accept=".pdf,.docx" onChange={onFileChange} />
            </label>
            <button
              type="button"
              onClick={handleUpload}
              disabled={loading !== null}
              className="focus-ring mt-3 inline-flex h-10 w-full items-center justify-center gap-2 border border-line bg-white text-sm font-semibold text-ink hover:border-accent disabled:opacity-60"
              style={{ borderRadius: 8 }}
            >
              {loading === "upload" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <FileText size={17} aria-hidden />}
              Upload resumes
            </button>
            {uploaded.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploaded.map((resume) => (
                  <div key={resume.id} className="flex items-center justify-between gap-3 border border-line px-3 py-2 text-sm" style={{ borderRadius: 6 }}>
                    <span className="truncate font-medium text-ink">{resume.candidate_name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{resume.characters.toLocaleString()} chars</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-line bg-white p-4 shadow-sm" style={{ borderRadius: 8 }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Job Description</h2>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={useLlm} onChange={(event) => setUseLlm(event.target.checked)} />
                LLM
              </label>
            </div>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              className="focus-ring min-h-80 w-full resize-y border border-line bg-white p-3 text-sm leading-6 text-ink"
              style={{ borderRadius: 8 }}
            />
          </div>

          <div className="border border-line bg-white p-4 shadow-sm" style={{ borderRadius: 8 }}>
            <div className="mb-3 flex items-center gap-2">
              <Mail size={18} className="text-accent" aria-hidden />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Shortlist</h2>
            </div>
            <input
              value={emailRecipient}
              onChange={(event) => setEmailRecipient(event.target.value)}
              placeholder="Recipient email"
              type="email"
              className="focus-ring h-10 w-full border border-line px-3 text-sm"
              style={{ borderRadius: 8 }}
            />
            <button
              type="button"
              onClick={handleEmailShortlist}
              disabled={!results || loading !== null}
              className="focus-ring mt-3 inline-flex h-10 w-full items-center justify-center gap-2 border border-line bg-white text-sm font-semibold text-ink hover:border-accent disabled:opacity-60"
              style={{ borderRadius: 8 }}
            >
              {loading === "email" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Mail size={17} aria-hidden />}
              Email selected
            </button>
          </div>
        </section>

        <section className="min-w-0 space-y-5">
          {error && (
            <div className="border border-danger bg-red-50 px-4 py-3 text-sm font-medium text-danger" style={{ borderRadius: 8 }}>
              {error}
            </div>
          )}
          {notice && (
            <div className="border border-mint bg-emerald-50 px-4 py-3 text-sm font-medium text-mint" style={{ borderRadius: 8 }}>
              {notice}
            </div>
          )}

          <div className="border border-line bg-white p-4 shadow-sm" style={{ borderRadius: 8 }}>
            <div className="grid gap-3 md:grid-cols-[1fr_190px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search candidates, files, or matched skills"
                  className="focus-ring h-11 w-full border border-line bg-white pl-10 pr-3 text-sm"
                  style={{ borderRadius: 8 }}
                />
              </label>
              <label className="relative block">
                <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
                <select
                  value={decision}
                  onChange={(event) => setDecision(event.target.value as (typeof decisions)[number])}
                  className="focus-ring h-11 w-full appearance-none border border-line bg-white pl-10 pr-3 text-sm"
                  style={{ borderRadius: 8 }}
                >
                  {decisions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {results ? (
            <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="space-y-3">
                {filteredResults.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    active={selected?.id === candidate.id}
                    onSelect={() => setSelectedId(candidate.id)}
                  />
                ))}
                {!filteredResults.length && (
                  <div className="border border-line bg-white p-6 text-sm text-slate-600" style={{ borderRadius: 8 }}>
                    No candidates match the current filters.
                  </div>
                )}
              </div>
              {selected && <CandidateDetail candidate={selected} jobAnalysis={results.job_analysis} />}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-[420px] place-items-center border border-line bg-white p-8 text-center shadow-sm" style={{ borderRadius: 8 }}>
      <div>
        <FileText className="mx-auto text-accent" size={36} aria-hidden />
        <h2 className="mt-4 text-lg font-semibold text-ink">Upload resumes and run analysis</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          Results will appear as ranked cards with score breakdowns, matched skills, missing skills, strengths, weaknesses, and recruiter-ready summaries.
        </p>
      </div>
    </div>
  );
}

function CandidateDetail({
  candidate,
  jobAnalysis,
}: {
  candidate: CandidateResult;
  jobAnalysis: AnalyzeResponse["job_analysis"];
}) {
  return (
    <aside className="border border-line bg-white p-5 shadow-sm" style={{ borderRadius: 8 }}>
      <div className="flex flex-col gap-4 border-b border-line pb-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold text-ink">{candidate.name}</h2>
          <p className="mt-1 truncate text-sm text-slate-500">{candidate.filename}</p>
        </div>
        <div className="shrink-0 text-left md:text-right">
          <div className="text-4xl font-semibold text-ink">{Math.round(candidate.score)}</div>
          <p className="text-sm text-slate-500">Final score</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="TF-IDF" value={Math.round(candidate.baseline_score).toString()} />
        <Metric label="AI score" value={candidate.llm_score === null ? "N/A" : Math.round(candidate.llm_score).toString()} />
        <Metric label="Decision" value={candidate.decision} />
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Explanation</h3>
        <p className="mt-2 text-sm leading-6 text-ink">{candidate.summary}</p>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ListBlock title="Matched Skills" items={candidate.skills_matched} tone="match" />
        <ListBlock title="Missing Skills" items={candidate.skills_missing} tone="missing" />
        <ListBlock title="Strengths" items={candidate.strengths} />
        <ListBlock title="Weaknesses" items={candidate.weaknesses} />
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Job Signals</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[...jobAnalysis.required_skills, ...jobAnalysis.preferred_skills, ...candidate.highlighted_terms].slice(0, 28).map((term) => (
            <span key={term} className="border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-accent" style={{ borderRadius: 6 }}>
              {term}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Highlighted Resume</h3>
        <ResumePreview text={candidate.resume_text} terms={[...candidate.skills_matched, ...candidate.highlighted_terms]} />
      </section>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-panel p-3" style={{ borderRadius: 8 }}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold text-ink">{value}</div>
    </div>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone?: "match" | "missing" }) {
  const color = tone === "match" ? "text-mint" : tone === "missing" ? "text-danger" : "text-ink";
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
      <ul className="mt-2 space-y-2">
        {(items.length ? items : ["None found"]).map((item) => (
          <li key={item} className={`border border-line bg-panel px-3 py-2 text-sm leading-5 ${color}`} style={{ borderRadius: 6 }}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResumePreview({ text, terms }: { text: string; terms: string[] }) {
  const uniqueTerms = Array.from(new Set(terms.filter((term) => term.length > 2))).slice(0, 40);
  const pattern = uniqueTerms.map(escapeRegExp).join("|");
  const parts = pattern ? text.split(new RegExp(`(${pattern})`, "gi")) : [text];

  return (
    <div className="mt-3 max-h-96 overflow-auto border border-line bg-panel p-4 text-sm leading-7 text-ink" style={{ borderRadius: 8 }}>
      {parts.map((part, index) => {
        const highlighted = uniqueTerms.some((term) => term.toLowerCase() === part.toLowerCase());
        return highlighted ? (
          <mark key={`${part}-${index}`} className="bg-amber-200 px-1 text-ink" style={{ borderRadius: 4 }}>
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </div>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
