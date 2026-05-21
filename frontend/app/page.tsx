"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  Mail,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AdminStats,
  analyze,
  AnalyzeResponse,
  CandidateResult,
  downloadAtsReport,
  downloadResultsCsv,
  getAdminStats,
  resumePreviewUrl,
  sendShortlistEmail,
  uploadResumes,
  UploadedResume,
} from "@/lib/api";
import { CandidateCard } from "@/components/CandidateCard";

const productName = "AI Resume Screening & ATS Analyzer";

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
const chartColors = ["#2563EB", "#0F766E", "#F59E0B", "#EF4444", "#7C3AED", "#0891B2"];

type ToastState = {
  type: "success" | "error" | "info";
  message: string;
};

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<UploadedResume[]>([]);
  const [jobDescription, setJobDescription] = useState(sampleJobDescription);
  const [useLlm, setUseLlm] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("recruiting@example.com");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState<(typeof decisions)[number]>("All");
  const [loading, setLoading] = useState<"upload" | "analyze" | "csv" | "email" | "stats" | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [previewCandidate, setPreviewCandidate] = useState<CandidateResult | null>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("ats-theme");
    if (savedTheme === "dark") setDarkMode(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("ats-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const selected = useMemo(() => {
    if (!results?.results.length) return null;
    return results.results.find((item) => item.id === selectedId) || results.results[0];
  }, [results, selectedId]);

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (results?.results || []).filter((candidate) => {
      const skillText = [
        ...candidate.skills_matched,
        ...candidate.skills_missing,
        ...candidate.technical_skills,
        ...candidate.soft_skills,
        ...candidate.tools,
      ].join(" ");
      const matchesDecision = decision === "All" || candidate.decision === decision;
      const matchesSearch =
        !query ||
        candidate.name.toLowerCase().includes(query) ||
        candidate.filename.toLowerCase().includes(query) ||
        skillText.toLowerCase().includes(query);
      return matchesDecision && matchesSearch;
    });
  }, [results, search, decision]);

  const dashboard = useMemo(() => buildDashboard(results, stats, uploaded.length), [results, stats, uploaded.length]);
  const analytics = useMemo(() => buildAnalytics(results?.results || []), [results]);

  function showToast(type: ToastState["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4200);
  }

  function setAcceptedFiles(nextFiles: File[]) {
    const accepted = nextFiles.filter((file) => /\.(pdf|docx)$/i.test(file.name));
    setFiles(accepted);
    if (accepted.length !== nextFiles.length) {
      showToast("error", "Only PDF and DOCX resumes are supported.");
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setAcceptedFiles(Array.from(event.target.files || []));
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    setAcceptedFiles(Array.from(event.dataTransfer.files || []));
  }

  async function handleUpload() {
    if (!files.length) {
      showToast("error", "Choose at least one PDF or DOCX resume.");
      return;
    }

    setLoading("upload");
    setUploadProgress(12);
    const progress = window.setInterval(() => {
      setUploadProgress((value) => Math.min(value + 13, 92));
    }, 300);

    try {
      const response = await uploadResumes(files, adminToken);
      setUploaded(response);
      setUploadProgress(100);
      showToast("success", `${response.length} resume${response.length === 1 ? "" : "s"} uploaded successfully.`);
      await refreshStats();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      window.clearInterval(progress);
      setLoading(null);
      window.setTimeout(() => setUploadProgress(0), 900);
    }
  }

  async function handleAnalyze() {
    setLoading("analyze");
    try {
      const response = await analyze(jobDescription, useLlm, adminToken);
      setResults(response);
      setSelectedId(response.results[0]?.id ?? null);
      showToast("success", "ATS analysis complete. Candidates are ranked by match quality.");
      await refreshStats();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(null);
    }
  }

  async function handleCsvDownload() {
    setLoading("csv");
    try {
      await downloadResultsCsv(adminToken);
      showToast("success", "CSV report downloaded.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "CSV export failed.");
    } finally {
      setLoading(null);
    }
  }

  async function handleReportDownload(candidate: CandidateResult) {
    setLoading("csv");
    try {
      await downloadAtsReport(candidate.id, adminToken);
      showToast("success", `${candidate.name}'s ATS report downloaded.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "ATS report download failed.");
    } finally {
      setLoading(null);
    }
  }

  async function handleEmailShortlist() {
    setLoading("email");
    try {
      const response = await sendShortlistEmail(emailRecipient, results?.run_id ?? null, adminToken);
      showToast("success", `${response.message} Candidates: ${response.candidates.join(", ")}`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Shortlist email failed.");
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
    <main className={`${darkMode ? "dark" : ""} min-h-screen bg-slate-100 text-ink transition dark:bg-slate-950 dark:text-white`}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_44%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_32%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)]">
        <header className="sticky top-0 z-30 border-b border-white/40 bg-white/75 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center bg-accent text-white shadow-sm" style={{ borderRadius: 8 }}>
                <BrainCircuit size={22} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{productName}</p>
                <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">Recruiter dashboard for ATS scoring, ranking, reports, and skill intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IconButton label="Toggle dark mode" onClick={() => setDarkMode((value) => !value)}>
                {darkMode ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
              </IconButton>
              <button
                type="button"
                onClick={handleCsvDownload}
                disabled={!results || loading !== null}
                className="focus-ring hidden h-10 items-center gap-2 border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-45 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 sm:inline-flex"
                style={{ borderRadius: 8 }}
              >
                {loading === "csv" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Download size={17} aria-hidden />}
                CSV
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading !== null}
                className="focus-ring inline-flex h-10 items-center gap-2 bg-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                style={{ borderRadius: 8 }}
              >
                {loading === "analyze" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Sparkles size={17} aria-hidden />}
                Analyze
              </button>
            </div>
          </div>
        </header>

        <section className="border-b border-white/50 bg-gradient-to-br from-blue-700 via-cyan-700 to-slate-950 text-white dark:border-white/10">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur" style={{ borderRadius: 999 }}>
                <ShieldCheck size={14} aria-hidden />
                Production-ready ATS intelligence
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{productName}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
                Upload resumes, paste a job description, and get ranked candidates with ATS scores, skill gaps, extraction, analytics, and recruiter-ready summaries.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              <HeroMetric label="Total resumes" value={dashboard.totalResumes} />
              <HeroMetric label="Shortlisted" value={dashboard.shortlisted} />
              <HeroMetric label="Rejected" value={dashboard.rejected} />
              <HeroMetric label="Avg ATS" value={`${dashboard.averageScore}%`} />
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          <section className="space-y-5">
            <Panel>
              <div className="mb-4 flex items-center justify-between gap-3">
                <SectionTitle icon={<UploadCloud size={18} aria-hidden />} title="Resume Upload" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">PDF / DOCX</span>
              </div>
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                className={`focus-ring flex min-h-36 cursor-pointer flex-col items-center justify-center border border-dashed px-5 py-6 text-center transition ${
                  dragActive
                    ? "border-accent bg-blue-50 text-accent dark:bg-blue-950/40"
                    : "border-slate-300 bg-slate-50 text-slate-600 hover:border-accent hover:bg-blue-50/60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                }`}
                style={{ borderRadius: 8 }}
              >
                <UploadCloud size={30} className="text-accent" aria-hidden />
                <span className="mt-3 text-sm font-semibold text-ink dark:text-white">
                  {files.length ? `${files.length} file${files.length === 1 ? "" : "s"} ready` : "Drag resumes here or browse"}
                </span>
                <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">Batch upload and ranking are supported</span>
                <input className="sr-only" type="file" multiple accept=".pdf,.docx" onChange={onFileChange} />
              </label>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.slice(0, 4).map((file) => (
                    <div key={file.name} className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2 text-sm dark:bg-white/5" style={{ borderRadius: 6 }}>
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">{formatBytes(file.size)}</span>
                    </div>
                  ))}
                </div>
              )}

              {uploadProgress > 0 && (
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>Upload progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden bg-slate-100 dark:bg-white/10" style={{ borderRadius: 999 }}>
                    <div className="h-full bg-accent transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleUpload}
                disabled={loading !== null}
                className="focus-ring mt-4 inline-flex h-11 w-full items-center justify-center gap-2 bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                style={{ borderRadius: 8 }}
              >
                {loading === "upload" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <FileText size={17} aria-hidden />}
                Upload resumes
              </button>
              {uploaded.length > 0 && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Upload stats</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <Metric label="Uploaded" value={uploaded.length.toString()} />
                    <Metric label="Parsed chars" value={uploaded.reduce((sum, item) => sum + item.characters, 0).toLocaleString()} />
                  </div>
                </div>
              )}
            </Panel>

            <Panel>
              <div className="mb-4 flex items-center justify-between gap-3">
                <SectionTitle icon={<FileText size={18} aria-hidden />} title="Job Description Matching" />
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={useLlm} onChange={(event) => setUseLlm(event.target.checked)} />
                  AI review
                </label>
              </div>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                className="focus-ring min-h-80 w-full resize-y border border-slate-200 bg-white p-3 text-sm leading-6 text-ink shadow-inner dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100"
                style={{ borderRadius: 8 }}
              />
            </Panel>

            <Panel>
              <SectionTitle icon={<ShieldCheck size={18} aria-hidden />} title="Admin & Shortlist" />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <input
                  value={adminToken}
                  onChange={(event) => setAdminToken(event.target.value)}
                  placeholder="Admin token"
                  type="password"
                  className="focus-ring h-11 w-full border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950/60"
                  style={{ borderRadius: 8 }}
                />
                <input
                  value={emailRecipient}
                  onChange={(event) => setEmailRecipient(event.target.value)}
                  placeholder="Recipient email"
                  type="email"
                  className="focus-ring h-11 w-full border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950/60"
                  style={{ borderRadius: 8 }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setLoading("stats");
                    await refreshStats();
                    setLoading(null);
                  }}
                  disabled={loading !== null}
                  className="focus-ring inline-flex h-10 items-center justify-center gap-2 border border-slate-200 bg-white text-sm font-semibold transition hover:border-accent hover:text-accent disabled:opacity-60 dark:border-white/10 dark:bg-white/10"
                  style={{ borderRadius: 8 }}
                >
                  {loading === "stats" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <BarChart3 size={16} aria-hidden />}
                  Stats
                </button>
                <button
                  type="button"
                  onClick={handleEmailShortlist}
                  disabled={!results || loading !== null}
                  className="focus-ring inline-flex h-10 items-center justify-center gap-2 border border-slate-200 bg-white text-sm font-semibold transition hover:border-accent hover:text-accent disabled:opacity-60 dark:border-white/10 dark:bg-white/10"
                  style={{ borderRadius: 8 }}
                >
                  {loading === "email" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Mail size={16} aria-hidden />}
                  Email
                </button>
              </div>
            </Panel>
          </section>

          <section className="min-w-0 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DashboardCard icon={<Users size={19} aria-hidden />} label="Total resumes" value={dashboard.totalResumes} />
              <DashboardCard icon={<CheckCircle2 size={19} aria-hidden />} label="Shortlisted" value={dashboard.shortlisted} tone="success" />
              <DashboardCard icon={<CircleAlert size={19} aria-hidden />} label="Rejected" value={dashboard.rejected} tone="danger" />
              <DashboardCard icon={<BarChart3 size={19} aria-hidden />} label="Average ATS score" value={`${dashboard.averageScore}%`} />
            </div>

            <Panel>
              <div className="grid gap-3 md:grid-cols-[1fr_190px]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search candidates, files, or skills"
                    className="focus-ring h-11 w-full border border-slate-200 bg-white pl-10 pr-3 text-sm dark:border-white/10 dark:bg-slate-950/60"
                    style={{ borderRadius: 8 }}
                  />
                </label>
                <label className="relative block">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
                  <select
                    value={decision}
                    onChange={(event) => setDecision(event.target.value as (typeof decisions)[number])}
                    className="focus-ring h-11 w-full appearance-none border border-slate-200 bg-white pl-10 pr-3 text-sm dark:border-white/10 dark:bg-slate-950/60"
                    style={{ borderRadius: 8 }}
                  >
                    {decisions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>
            </Panel>

            {results ? (
              <>
                {results.results[0] && <TopCandidateHighlight candidate={results.results[0]} onReport={() => handleReportDownload(results.results[0])} onPreview={() => setPreviewCandidate(results.results[0])} />}
                <AnalyticsGrid analytics={analytics} />
                <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
                  <div className="space-y-3">
                    {filteredResults.map((candidate, index) => {
                      const originalRank = results.results.findIndex((item) => item.id === candidate.id);
                      return (
                        <CandidateCard
                          key={candidate.id}
                          candidate={candidate}
                          rank={originalRank >= 0 ? originalRank + 1 : index + 1}
                          active={selected?.id === candidate.id}
                          onSelect={() => setSelectedId(candidate.id)}
                        />
                      );
                    })}
                    {!filteredResults.length && <SmallEmptyState message="No candidates match the current filters." />}
                  </div>
                  {selected && (
                    <CandidateDetail
                      candidate={selected}
                      jobAnalysis={results.job_analysis}
                      onDownloadReport={() => handleReportDownload(selected)}
                      onPreviewResume={() => setPreviewCandidate(selected)}
                    />
                  )}
                </div>
              </>
            ) : loading === "analyze" ? (
              <LoadingSkeleton />
            ) : (
              <EmptyState />
            )}
          </section>
        </div>

        <footer className="border-t border-slate-200 bg-white/70 px-5 py-6 text-center text-sm text-slate-500 backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-400">
          {productName} - Built for explainable resume screening, ATS analytics, and recruiter productivity.
        </footer>

        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
        {previewCandidate && (
          <ResumePreviewModal
            candidate={previewCandidate}
            previewUrl={resumePreviewUrl(previewCandidate.id, adminToken)}
            onClose={() => setPreviewCandidate(null)}
          />
        )}
      </div>
    </main>
  );
}

function CandidateDetail({
  candidate,
  jobAnalysis,
  onDownloadReport,
  onPreviewResume,
}: {
  candidate: CandidateResult;
  jobAnalysis: AnalyzeResponse["job_analysis"];
  onDownloadReport: () => void;
  onPreviewResume: () => void;
}) {
  const allSkills = [...candidate.technical_skills, ...candidate.tools, ...candidate.soft_skills];

  return (
    <aside className="border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85" style={{ borderRadius: 8 }}>
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between dark:border-white/10">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">{candidate.name}</h2>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{candidate.filename}</p>
        </div>
        <div className="shrink-0 text-left md:text-right">
          <div className="text-4xl font-semibold">{Math.round(candidate.score)}%</div>
          <p className="text-sm text-slate-500 dark:text-slate-400">ATS match</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onPreviewResume}
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 border border-slate-200 bg-white text-sm font-semibold transition hover:border-accent hover:text-accent dark:border-white/10 dark:bg-white/10"
          style={{ borderRadius: 8 }}
        >
          <Eye size={16} aria-hidden />
          Preview resume
        </button>
        <button
          type="button"
          onClick={onDownloadReport}
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 bg-accent text-sm font-semibold text-white transition hover:bg-blue-700"
          style={{ borderRadius: 8 }}
        >
          <Download size={16} aria-hidden />
          ATS report PDF
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="TF-IDF" value={Math.round(candidate.baseline_score).toString()} />
        <Metric label="AI score" value={candidate.llm_score === null ? "N/A" : Math.round(candidate.llm_score).toString()} />
        <Metric label="Decision" value={candidate.decision} />
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">ATS Breakdown</h3>
        <div className="mt-3 space-y-3">
          {Object.entries(candidate.ats_breakdown).map(([label, value]) => (
            <ScoreRow key={label} label={humanize(label)} value={value} />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recruiter Summary</h3>
        <p className="mt-2 text-sm leading-6">{candidate.summary}</p>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ListBlock title="Matched Skills" items={candidate.skills_matched} tone="match" />
        <ListBlock title="Missing Skills" items={candidate.skills_missing} tone="missing" />
        <ListBlock title="AI Suggestions" items={candidate.recommended_improvements} />
        <ListBlock title="Extracted Skills" items={allSkills} />
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Job Signals</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[...jobAnalysis.required_skills, ...jobAnalysis.preferred_skills, ...candidate.highlighted_terms].slice(0, 28).map((term) => (
            <span key={term} className="border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-accent dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200" style={{ borderRadius: 999 }}>
              {term}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Resume Preview</h3>
        <ResumePreview text={candidate.resume_text} terms={[...candidate.skills_matched, ...candidate.highlighted_terms]} />
      </section>
    </aside>
  );
}

function AnalyticsGrid({ analytics }: { analytics: ReturnType<typeof buildAnalytics> }) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <ChartPanel title="ATS Score Distribution">
        {analytics.distribution.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={analytics.distribution} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                {analytics.distribution.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <SmallEmptyState message="Run analysis to see score distribution." />
        )}
      </ChartPanel>
      <ChartPanel title="Skill Frequency">
        {analytics.skills.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.skills}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0F766E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <SmallEmptyState message="Matched skills will appear here." />
        )}
      </ChartPanel>
      <ChartPanel title="Candidate Ranking">
        {analytics.ranking.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.ranking} layout="vertical" margin={{ left: 14 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={74} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" fill="#2563EB" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <SmallEmptyState message="Candidate rankings will appear here." />
        )}
      </ChartPanel>
    </div>
  );
}

function TopCandidateHighlight({
  candidate,
  onReport,
  onPreview,
}: {
  candidate: CandidateResult;
  onReport: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="overflow-hidden border border-blue-200 bg-gradient-to-br from-blue-700 via-cyan-700 to-slate-950 text-white shadow-sm dark:border-blue-400/20" style={{ borderRadius: 8 }}>
      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Top candidate</p>
          <h2 className="mt-2 text-2xl font-semibold">{candidate.name}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">{candidate.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {candidate.skills_matched.slice(0, 6).map((skill) => (
              <span key={skill} className="border border-white/20 bg-white/10 px-2 py-1 text-xs font-medium backdrop-blur" style={{ borderRadius: 999 }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-44">
          <div className="text-5xl font-semibold">{Math.round(candidate.score)}%</div>
          <p className="mt-1 text-sm text-blue-100">ATS match</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={onPreview} className="focus-ring inline-flex h-10 items-center justify-center gap-2 bg-white/10 text-sm font-semibold backdrop-blur transition hover:bg-white/20" style={{ borderRadius: 8 }}>
              <Eye size={16} aria-hidden />
              Preview
            </button>
            <button type="button" onClick={onReport} className="focus-ring inline-flex h-10 items-center justify-center gap-2 bg-white text-sm font-semibold text-blue-700 transition hover:bg-blue-50" style={{ borderRadius: 8 }}>
              <Download size={16} aria-hidden />
              Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Panel key={item}>
            <div className="h-4 w-36 animate-pulse bg-slate-200 dark:bg-white/10" style={{ borderRadius: 999 }} />
            <div className="mt-5 h-44 animate-pulse bg-slate-100 dark:bg-white/5" style={{ borderRadius: 8 }} />
          </Panel>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85" style={{ borderRadius: 8 }}>
              <div className="h-5 w-2/3 animate-pulse bg-slate-200 dark:bg-white/10" style={{ borderRadius: 999 }} />
              <div className="mt-3 h-3 w-full animate-pulse bg-slate-100 dark:bg-white/5" style={{ borderRadius: 999 }} />
              <div className="mt-4 h-16 animate-pulse bg-slate-100 dark:bg-white/5" style={{ borderRadius: 8 }} />
            </div>
          ))}
        </div>
        <Panel>
          <div className="h-6 w-56 animate-pulse bg-slate-200 dark:bg-white/10" style={{ borderRadius: 999 }} />
          <div className="mt-5 h-80 animate-pulse bg-slate-100 dark:bg-white/5" style={{ borderRadius: 8 }} />
        </Panel>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-[440px] place-items-center border border-white/70 bg-white/80 p-8 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80" style={{ borderRadius: 8 }}>
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center bg-blue-50 text-accent dark:bg-blue-400/10" style={{ borderRadius: 8 }}>
          <FileText size={30} aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Upload resumes and run ATS analysis</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
          Ranked candidate cards, missing skills, score breakdowns, analytics, and resume previews will appear here.
        </p>
      </div>
    </div>
  );
}

function ResumePreviewModal({
  candidate,
  previewUrl,
  onClose,
}: {
  candidate: CandidateResult;
  previewUrl: string;
  onClose: () => void;
}) {
  const isPdf = candidate.filename.toLowerCase().endsWith(".pdf");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden border border-white/20 bg-white shadow-2xl dark:bg-slate-950" style={{ borderRadius: 8 }}>
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{candidate.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{candidate.filename}</p>
          </div>
          <button type="button" aria-label="Close resume preview" onClick={onClose} className="focus-ring grid h-9 w-9 shrink-0 place-items-center border border-slate-200 bg-white text-slate-600 hover:text-slate-950 dark:border-white/10 dark:bg-white/10 dark:text-slate-100" style={{ borderRadius: 8 }}>
            <X size={17} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-slate-100 p-3 dark:bg-slate-900">
          {isPdf ? (
            <iframe title={`${candidate.name} resume preview`} src={previewUrl} className="h-[72vh] w-full border border-slate-200 bg-white dark:border-white/10" style={{ borderRadius: 8 }} />
          ) : (
            <div className="h-[72vh] overflow-auto border border-slate-200 bg-white p-5 text-sm leading-7 dark:border-white/10 dark:bg-slate-950" style={{ borderRadius: 8 }}>
              <p className="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-400">DOCX browser preview is shown as parsed text.</p>
              {candidate.resume_text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85" style={{ borderRadius: 8 }}>
      {children}
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h2>
      {children}
    </Panel>
  );
}

function DashboardCard({ icon, label, value, tone = "default" }: { icon: React.ReactNode; label: string; value: string | number; tone?: "default" | "success" | "danger" }) {
  const toneClass = tone === "success" ? "text-mint bg-emerald-50 dark:bg-emerald-400/10" : tone === "danger" ? "text-danger bg-red-50 dark:bg-red-400/10" : "text-accent bg-blue-50 dark:bg-blue-400/10";
  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center ${toneClass}`} style={{ borderRadius: 8 }}>
          {icon}
        </div>
      </div>
    </Panel>
  );
}

function HeroMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-white/20 bg-white/10 p-4 shadow-sm backdrop-blur" style={{ borderRadius: 8 }}>
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5" style={{ borderRadius: 8 }}>
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold">{value}</div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-100">
      <span className="text-accent">{icon}</span>
      <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="focus-ring grid h-10 w-10 place-items-center border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-accent hover:text-accent dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
      style={{ borderRadius: 8 }}
    >
      {children}
    </button>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2 overflow-hidden bg-slate-100 dark:bg-white/10" style={{ borderRadius: 999 }}>
        <div className="h-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone?: "match" | "missing" }) {
  const color = tone === "match" ? "text-mint" : tone === "missing" ? "text-danger" : "text-slate-700 dark:text-slate-200";
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
      <ul className="mt-2 space-y-2">
        {(items.length ? items : ["None found"]).map((item) => (
          <li key={item} className={`border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 dark:border-white/10 dark:bg-white/5 ${color}`} style={{ borderRadius: 6 }}>
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
    <div className="mt-3 max-h-96 overflow-auto border border-slate-200 bg-slate-50 p-4 text-sm leading-7 dark:border-white/10 dark:bg-slate-950/60" style={{ borderRadius: 8 }}>
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

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  const tone = toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : toast.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800";
  return (
    <div className={`fixed right-4 top-20 z-50 flex max-w-md items-start gap-3 border px-4 py-3 text-sm font-medium shadow-lg ${tone}`} style={{ borderRadius: 8 }}>
      <span className="leading-6">{toast.message}</span>
      <button type="button" aria-label="Close notification" onClick={onClose} className="shrink-0 pt-0.5">
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}

function SmallEmptyState({ message }: { message: string }) {
  return (
    <div className="grid min-h-36 place-items-center border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400" style={{ borderRadius: 8 }}>
      {message}
    </div>
  );
}

function buildDashboard(results: AnalyzeResponse | null, stats: AdminStats | null, uploadedCount: number) {
  const candidates = results?.results || [];
  const averageFromResults = candidates.length ? Math.round(candidates.reduce((sum, item) => sum + item.score, 0) / candidates.length) : 0;
  return {
    totalResumes: stats?.resumes ?? Math.max(uploadedCount, candidates.length),
    shortlisted: stats?.selected ?? candidates.filter((item) => item.decision === "Selected").length,
    rejected: stats?.rejected ?? candidates.filter((item) => item.decision === "Rejected").length,
    averageScore: Math.round(stats?.average_ats_score ?? averageFromResults),
  };
}

function buildAnalytics(candidates: CandidateResult[]) {
  const distribution = [
    { name: "80-100", value: candidates.filter((item) => item.score >= 80).length },
    { name: "60-79", value: candidates.filter((item) => item.score >= 60 && item.score < 80).length },
    { name: "40-59", value: candidates.filter((item) => item.score >= 40 && item.score < 60).length },
    { name: "0-39", value: candidates.filter((item) => item.score < 40).length },
  ].filter((item) => item.value > 0);

  const skillCounts = new Map<string, number>();
  candidates.forEach((candidate) => {
    [...candidate.skills_matched, ...candidate.technical_skills, ...candidate.tools].forEach((skill) => {
      skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
    });
  });
  const skills = Array.from(skillCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, value]) => ({ name, value }));

  const ranking = candidates.slice(0, 5).map((candidate) => ({
    name: candidate.name.split(" ")[0] || candidate.name,
    score: Math.round(candidate.score),
  }));

  return { distribution, skills, ranking };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
