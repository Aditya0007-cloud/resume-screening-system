from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.api.auth import require_admin
from backend.config import get_settings
from backend.database import get_db
from backend.models import Resume, ScreeningResult, ScreeningRun
from backend.schemas.result import (
    AdminStats,
    AnalyzeRequest,
    AnalyzeResponse,
    EmailShortlistRequest,
    EmailShortlistResponse,
    UploadResponse,
)
from backend.services.emailer import send_shortlist_email
from backend.services.parser import ResumeParseError, parse_resume
from backend.services.screening import run_screening, serialize_run
from backend.utils.csv_export import results_to_csv

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.post("/upload-resumes", response_model=list[UploadResponse])
async def upload_resumes(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
) -> list[UploadResponse]:
    settings = get_settings()
    responses: list[UploadResponse] = []

    for file in files:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in {".pdf", ".docx"}:
            raise HTTPException(status_code=400, detail=f"{file.filename} must be a PDF or DOCX file.")

        stored_name = f"{uuid4().hex}{suffix}"
        path = settings.upload_dir / stored_name
        path.write_bytes(await file.read())

        try:
            text, candidate_name = parse_resume(path, file.filename or stored_name)
        except ResumeParseError as exc:
            path.unlink(missing_ok=True)
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        resume = Resume(
            filename=stored_name,
            original_filename=file.filename or stored_name,
            candidate_name=candidate_name,
            text=text,
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
        responses.append(
            UploadResponse(
                id=resume.id,
                filename=resume.original_filename,
                candidate_name=resume.candidate_name,
                characters=len(resume.text),
            )
        )

    return responses


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(
    request: AnalyzeRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
) -> dict:
    try:
        run = run_screening(db, request.job_description, request.use_llm)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return serialize_run(run)


@router.get("/results", response_model=AnalyzeResponse)
def latest_results(db: Session = Depends(get_db)) -> dict:
    run = db.query(ScreeningRun).order_by(ScreeningRun.created_at.desc()).first()
    if not run:
        raise HTTPException(status_code=404, detail="No screening results are available yet.")
    return serialize_run(run)


@router.get("/results/export", response_class=PlainTextResponse)
def export_results(
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
) -> PlainTextResponse:
    run = db.query(ScreeningRun).order_by(ScreeningRun.created_at.desc()).first()
    if not run:
        raise HTTPException(status_code=404, detail="No screening results are available yet.")
    csv_text = results_to_csv(serialize_run(run)["results"])
    return PlainTextResponse(
        csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=resume-screening-results.csv"},
    )


@router.get("/resumes")
def list_resumes(db: Session = Depends(get_db)) -> list[dict]:
    resumes = db.query(Resume).order_by(Resume.uploaded_at.desc()).all()
    return [
        {
            "id": resume.id,
            "filename": resume.original_filename,
            "candidate_name": resume.candidate_name,
            "uploaded_at": resume.uploaded_at,
            "characters": len(resume.text),
        }
        for resume in resumes
    ]


@router.post("/shortlist/email", response_model=EmailShortlistResponse)
def email_shortlist(
    request: EmailShortlistRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
) -> dict:
    query = db.query(ScreeningRun)
    if request.run_id:
        run = query.filter(ScreeningRun.id == request.run_id).first()
    else:
        run = query.order_by(ScreeningRun.created_at.desc()).first()
    if not run:
        raise HTTPException(status_code=404, detail="No screening run found.")

    payload = serialize_run(run)
    candidates = [result for result in payload["results"] if result["decision"] == request.decision]
    if not candidates:
        raise HTTPException(status_code=400, detail=f"No {request.decision} candidates found.")

    outcome = send_shortlist_email(request.recipient_email, candidates)
    return {
        "sent": outcome["sent"],
        "mode": outcome["mode"],
        "recipient_email": request.recipient_email,
        "candidates": [candidate["name"] for candidate in candidates],
        "message": outcome["message"],
    }


@router.get("/admin/stats", response_model=AdminStats)
def admin_stats(
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
) -> dict:
    decision_counts = dict(
        db.query(ScreeningResult.decision, func.count(ScreeningResult.id))
        .group_by(ScreeningResult.decision)
        .all()
    )
    return {
        "resumes": db.query(func.count(Resume.id)).scalar() or 0,
        "screening_runs": db.query(func.count(ScreeningRun.id)).scalar() or 0,
        "results": db.query(func.count(ScreeningResult.id)).scalar() or 0,
        "selected": decision_counts.get("Selected", 0),
        "maybe": decision_counts.get("Maybe", 0),
        "rejected": decision_counts.get("Rejected", 0),
        "average_ats_score": round(db.query(func.avg(ScreeningResult.score)).scalar() or 0, 1),
    }
