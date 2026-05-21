from __future__ import annotations

import re

from backend.utils.text import (
    extract_known_skills,
    extract_skill_categories,
    top_keywords,
    clamp_score,
)


def evaluate_ats_profile(resume_text: str, job_description: str, job_analysis: dict) -> dict:
    """Return an explainable ATS profile for one resume/job pair."""
    job_skills = sorted(set(job_analysis["required_skills"] + job_analysis["preferred_skills"]))
    resume_skills = set(extract_known_skills(resume_text))
    matched_skills = sorted(skill for skill in job_skills if skill in resume_skills)
    missing_skills = sorted(skill for skill in job_skills if skill not in resume_skills)

    breakdown = {
        "skills_match": _ratio_score(len(matched_skills), len(job_skills)),
        "formatting": _formatting_score(resume_text),
        "keywords": _keyword_score(resume_text, job_description),
        "experience": _section_score(resume_text, ["experience", "work history", "employment", "projects"]),
        "education": _section_score(resume_text, ["education", "degree", "university", "college", "bachelor", "master"]),
    }
    ats_score = clamp_score(
        (breakdown["skills_match"] * 0.35)
        + (breakdown["keywords"] * 0.20)
        + (breakdown["formatting"] * 0.15)
        + (breakdown["experience"] * 0.15)
        + (breakdown["education"] * 0.15)
    )

    categories = extract_skill_categories(resume_text)
    recommendations = _recommendations(missing_skills, breakdown)
    return {
        "ats_score": ats_score,
        "breakdown": breakdown,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "technical_skills": categories["technical"],
        "soft_skills": categories["soft"],
        "tools": categories["tools"],
        "recommended_improvements": recommendations,
    }


def _ratio_score(found: int, total: int) -> float:
    if total <= 0:
        return 75.0
    return clamp_score((found / total) * 100)


def _keyword_score(resume_text: str, job_description: str) -> float:
    job_keywords = set(top_keywords(job_description, limit=24))
    resume_keywords = set(top_keywords(resume_text, limit=80))
    if not job_keywords:
        return 70.0
    return _ratio_score(len(job_keywords & resume_keywords), len(job_keywords))


def _formatting_score(text: str) -> float:
    lowered = text.lower()
    score = 45
    if re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text):
        score += 12
    if re.search(r"\+?\d[\d\s().-]{7,}", text):
        score += 8
    if any(section in lowered for section in ["summary", "skills", "experience", "education", "projects"]):
        score += 15
    if 700 <= len(text) <= 9000:
        score += 10
    if any(marker in text for marker in [" - ", "•", "\n-"]):
        score += 10
    return clamp_score(score)


def _section_score(text: str, anchors: list[str]) -> float:
    lowered = text.lower()
    if any(anchor in lowered for anchor in anchors):
        return 90.0
    if any(re.search(pattern, lowered) for pattern in [r"\d\+?\s+years?", r"b\.?tech", r"m\.?s\.?", r"bachelor", r"master"]):
        return 70.0
    return 35.0


def _recommendations(missing_skills: list[str], breakdown: dict[str, float]) -> list[str]:
    recommendations = []
    if missing_skills:
        recommendations.append(f"Add evidence for missing role skills: {', '.join(missing_skills[:6])}.")
    if breakdown["formatting"] < 70:
        recommendations.append("Use clear section headings, contact details, and simple bullet formatting.")
    if breakdown["keywords"] < 55:
        recommendations.append("Mirror important job-description keywords where they truthfully match experience.")
    if breakdown["experience"] < 70:
        recommendations.append("Add a dedicated experience or projects section with measurable outcomes.")
    if breakdown["education"] < 70:
        recommendations.append("Include education, certifications, or training details in a readable section.")
    return recommendations or ["Resume is well aligned. Add quantified impact bullets to make the match even stronger."]
