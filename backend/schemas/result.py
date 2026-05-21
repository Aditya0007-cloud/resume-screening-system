from datetime import datetime

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    job_description: str = Field(..., min_length=40)
    use_llm: bool = True


class UploadResponse(BaseModel):
    id: int
    filename: str
    candidate_name: str
    characters: int


class JobDescriptionAnalysis(BaseModel):
    required_skills: list[str]
    preferred_skills: list[str]
    experience_level: str
    keywords: list[str]


class CandidateResult(BaseModel):
    id: int
    resume_id: int
    name: str
    filename: str
    score: float
    baseline_score: float
    llm_score: float | None
    skills_matched: list[str]
    skills_missing: list[str]
    strengths: list[str]
    weaknesses: list[str]
    summary: str
    decision: str
    highlighted_terms: list[str]
    resume_text: str
    ats_breakdown: dict[str, float]
    match_percentage: float
    technical_skills: list[str]
    soft_skills: list[str]
    tools: list[str]
    recommended_improvements: list[str]


class AnalyzeResponse(BaseModel):
    run_id: int
    created_at: datetime
    job_analysis: JobDescriptionAnalysis
    results: list[CandidateResult]


class EmailShortlistRequest(BaseModel):
    run_id: int | None = None
    recipient_email: str = Field(..., min_length=5)
    decision: str = "Selected"


class EmailShortlistResponse(BaseModel):
    sent: bool
    mode: str
    recipient_email: str
    candidates: list[str]
    message: str


class AdminStats(BaseModel):
    resumes: int
    screening_runs: int
    results: int
    selected: int
    maybe: int
    rejected: int
    average_ats_score: float
