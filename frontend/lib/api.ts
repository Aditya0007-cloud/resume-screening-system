export type CandidateResult = {
  id: number;
  name: string;
  filename: string;
  score: number;
  baseline_score: number;
  llm_score: number | null;
  skills_matched: string[];
  skills_missing: string[];
  strengths: string[];
  weaknesses: string[];
  summary: string;
  decision: "Selected" | "Maybe" | "Rejected";
  highlighted_terms: string[];
  resume_text: string;
};

export type AdminStats = {
  resumes: number;
  screening_runs: number;
  results: number;
  selected: number;
  maybe: number;
  rejected: number;
};

export type AnalyzeResponse = {
  run_id: number;
  created_at: string;
  job_analysis: {
    required_skills: string[];
    preferred_skills: string[];
    experience_level: string;
    keywords: string[];
  };
  results: CandidateResult[];
};

export type UploadedResume = {
  id: number;
  filename: string;
  candidate_name: string;
  characters: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function adminHeaders(adminToken: string, contentType = false) {
  const headers: Record<string, string> = {};
  if (contentType) headers["Content-Type"] = "application/json";
  if (adminToken.trim()) headers["X-Admin-Token"] = adminToken.trim();
  return headers;
}

async function readError(response: Response) {
  try {
    const body = await response.json();
    return body.detail || "Request failed";
  } catch {
    return "Request failed";
  }
}

export async function uploadResumes(files: File[], adminToken = "") {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const response = await fetch(`${API_BASE}/upload-resumes`, {
    method: "POST",
    headers: adminHeaders(adminToken),
    body: form,
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as UploadedResume[];
}

export async function analyze(jobDescription: string, useLlm: boolean, adminToken = "") {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: adminHeaders(adminToken, true),
    body: JSON.stringify({ job_description: jobDescription, use_llm: useLlm }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as AnalyzeResponse;
}

export async function downloadResultsCsv(adminToken = "") {
  const response = await fetch(`${API_BASE}/results/export`, {
    headers: adminHeaders(adminToken),
  });
  if (!response.ok) throw new Error(await readError(response));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "resume-screening-results.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export async function sendShortlistEmail(recipientEmail: string, runId: number | null, adminToken = "") {
  const response = await fetch(`${API_BASE}/shortlist/email`, {
    method: "POST",
    headers: adminHeaders(adminToken, true),
    body: JSON.stringify({ recipient_email: recipientEmail, run_id: runId, decision: "Selected" }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as {
    sent: boolean;
    mode: string;
    recipient_email: string;
    candidates: string[];
    message: string;
  };
}

export async function getAdminStats(adminToken = "") {
  const response = await fetch(`${API_BASE}/admin/stats`, {
    headers: adminHeaders(adminToken),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as AdminStats;
}
