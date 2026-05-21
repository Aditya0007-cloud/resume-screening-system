import json

from sqlalchemy.orm import Session

from backend.models import Resume, ScreeningResult, ScreeningRun
from backend.services.ats import evaluate_ats_profile
from backend.services.job_description import analyze_job_description
from backend.services.llm_evaluator import evaluate_with_openai
from backend.services.matcher import baseline_scores, heuristic_llm_like_score, skill_gap
from backend.utils.text import clamp_score


def run_screening(db: Session, job_description: str, use_llm: bool = True) -> ScreeningRun:
    resumes = db.query(Resume).order_by(Resume.uploaded_at.desc()).all()
    if not resumes:
        raise ValueError("Upload at least one resume before running analysis.")

    job_analysis = analyze_job_description(job_description)
    run = ScreeningRun(
        job_description=job_description,
        required_skills=json.dumps(job_analysis["required_skills"]),
        preferred_skills=json.dumps(job_analysis["preferred_skills"]),
        experience_level=job_analysis["experience_level"],
        keywords=json.dumps(job_analysis["keywords"]),
    )
    db.add(run)
    db.flush()

    baselines = baseline_scores(job_description, [resume.text for resume in resumes])
    job_skills = sorted(set(job_analysis["required_skills"] + job_analysis["preferred_skills"]))

    for resume, baseline in zip(resumes, baselines, strict=False):
        matched_required, missing_required = skill_gap(job_analysis["required_skills"], resume.text)
        matched_preferred, missing_preferred = skill_gap(job_analysis["preferred_skills"], resume.text)
        ats_profile = evaluate_ats_profile(resume.text, job_description, job_analysis)
        llm_result = evaluate_with_openai(resume.text, job_description, job_analysis) if use_llm else None

        if llm_result:
            llm_score = clamp_score(float(llm_result["score"]))
            score = clamp_score((ats_profile["ats_score"] * 0.55) + (llm_score * 0.35) + (baseline * 0.10))
            skills_matched = sorted(set(llm_result["skills_matched"]) | set(ats_profile["matched_skills"]) | set(matched_required) | set(matched_preferred))
            skills_missing = sorted(set(llm_result["skills_missing"]) | set(ats_profile["missing_skills"]) | set(missing_required))
            strengths = llm_result["strengths"]
            weaknesses = sorted(set(llm_result["weaknesses"] + ats_profile["recommended_improvements"]))
            summary = llm_result["summary"]
        else:
            llm_score = heuristic_llm_like_score(
                baseline,
                matched_required,
                missing_required,
                matched_preferred,
                len(job_analysis["required_skills"]),
                len(job_analysis["preferred_skills"]),
            )
            score = clamp_score((ats_profile["ats_score"] * 0.75) + (llm_score * 0.15) + (baseline * 0.10))
            skills_matched = sorted(set(ats_profile["matched_skills"] + matched_required + matched_preferred))
            skills_missing = sorted(set(ats_profile["missing_skills"] + missing_required + missing_preferred))
            strengths = _strengths(skills_matched, resume.text)
            weaknesses = sorted(set(_weaknesses(skills_missing) + ats_profile["recommended_improvements"]))
            summary = _summary(resume.candidate_name, skills_matched, skills_missing, ats_profile["ats_score"])

        result = ScreeningResult(
            run_id=run.id,
            resume_id=resume.id,
            score=score,
            baseline_score=baseline,
            llm_score=llm_score,
            decision=_decision(score),
            skills_matched=json.dumps(skills_matched),
            skills_missing=json.dumps(skills_missing),
            strengths=json.dumps(strengths),
            weaknesses=json.dumps(weaknesses),
            summary=summary,
            highlighted_terms=json.dumps(sorted(set(job_skills[:12] + job_analysis["keywords"][:8]))),
            ats_breakdown=json.dumps(ats_profile["breakdown"]),
            technical_skills=json.dumps(ats_profile["technical_skills"]),
            soft_skills=json.dumps(ats_profile["soft_skills"]),
            tools=json.dumps(ats_profile["tools"]),
            recommended_improvements=json.dumps(ats_profile["recommended_improvements"]),
        )
        db.add(result)

    db.commit()
    db.refresh(run)
    return run


def serialize_run(run: ScreeningRun) -> dict:
    sorted_results = sorted(run.results, key=lambda item: item.score, reverse=True)
    return {
        "run_id": run.id,
        "created_at": run.created_at,
        "job_analysis": {
            "required_skills": json.loads(run.required_skills),
            "preferred_skills": json.loads(run.preferred_skills),
            "experience_level": run.experience_level,
            "keywords": json.loads(run.keywords),
        },
        "results": [
            {
                "id": result.id,
                "resume_id": result.resume_id,
                "name": result.resume.candidate_name,
                "filename": result.resume.original_filename,
                "score": result.score,
                "baseline_score": result.baseline_score,
                "llm_score": result.llm_score,
                "skills_matched": json.loads(result.skills_matched),
                "skills_missing": json.loads(result.skills_missing),
                "strengths": json.loads(result.strengths),
                "weaknesses": json.loads(result.weaknesses),
                "summary": result.summary,
                "decision": result.decision,
                "highlighted_terms": json.loads(result.highlighted_terms),
                "resume_text": result.resume.text[:12000],
                "ats_breakdown": json.loads(result.ats_breakdown),
                "match_percentage": result.score,
                "technical_skills": json.loads(result.technical_skills),
                "soft_skills": json.loads(result.soft_skills),
                "tools": json.loads(result.tools),
                "recommended_improvements": json.loads(result.recommended_improvements),
            }
            for result in sorted_results
        ],
    }


def _decision(score: float) -> str:
    if score >= 65:
        return "Selected"
    if score >= 50:
        return "Maybe"
    return "Rejected"


def _strengths(skills: list[str], resume_text: str) -> list[str]:
    strengths = []
    if skills:
        strengths.append(f"Shows evidence for {', '.join(skills[:5])}.")
    if any(term in resume_text.lower() for term in ["lead", "architect", "mentor", "managed"]):
        strengths.append("Includes leadership or ownership indicators.")
    if any(term in resume_text.lower() for term in ["deployed", "production", "launched"]):
        strengths.append("Mentions production delivery experience.")
    return strengths or ["Resume contains some relevant background, but evidence is limited."]


def _weaknesses(missing: list[str]) -> list[str]:
    if missing:
        return [f"Missing clear evidence for {', '.join(missing[:6])}."]
    return ["No major required skill gaps detected by the baseline evaluator."]


def _summary(name: str, matched: list[str], missing: list[str], ats_score: float) -> str:
    if not matched:
        return f"{name} has a weak keyword and skill match for this role. ATS compatibility is {ats_score}."
    if missing:
        return f"{name} matches {len(matched)} target skills but has gaps in {', '.join(missing[:4])}."
    return f"{name} is a strong match across the extracted role requirements."
