from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    results: Mapped[list["ScreeningResult"]] = relationship(back_populates="resume")


class ScreeningRun(Base):
    __tablename__ = "screening_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    job_description: Mapped[str] = mapped_column(Text, nullable=False)
    required_skills: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    preferred_skills: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    experience_level: Mapped[str] = mapped_column(String(100), nullable=False, default="Not specified")
    keywords: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    results: Mapped[list["ScreeningResult"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class ScreeningResult(Base):
    __tablename__ = "screening_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("screening_runs.id"), nullable=False)
    resume_id: Mapped[int] = mapped_column(ForeignKey("resumes.id"), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    baseline_score: Mapped[float] = mapped_column(Float, nullable=False)
    llm_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    decision: Mapped[str] = mapped_column(String(20), nullable=False)
    skills_matched: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    skills_missing: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    strengths: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    weaknesses: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    highlighted_terms: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    ats_breakdown: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    technical_skills: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    soft_skills: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    tools: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    recommended_improvements: Mapped[str] = mapped_column(Text, nullable=False, default="[]")

    run: Mapped[ScreeningRun] = relationship(back_populates="results")
    resume: Mapped[Resume] = relationship(back_populates="results")
