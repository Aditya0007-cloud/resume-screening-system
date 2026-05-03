# AI Resume Screening & Ranking System

Production-ready starter app for screening batches of PDF/DOCX resumes against a job description. The backend parses resumes, extracts role signals, computes a TF-IDF cosine baseline, optionally calls OpenAI for structured evaluation, combines scores, stores results in SQLite, and exposes ranked results to a Next.js dashboard.

## Architecture

- `frontend/`: Next.js + Tailwind dashboard for upload, job description input, ranking, filtering, admin stats, highlighted resume review, shortlist email, and CSV export.
- `backend/`: FastAPI service with SQLAlchemy models, resume parsers, job description analysis, TF-IDF matching, OpenAI evaluation, and result serialization.
- `data/`: SQLite database location, generated uploads, sample job description, and sample resume source data.

The AI path is optional. If `OPENAI_API_KEY` is unset, `/analyze` uses a deterministic local evaluator with the same response schema so the app remains fully usable.

## Backend Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m backend.utils.generate_sample_files
uvicorn backend.main:app --reload --port 8000
```

Add your key to `.env` to enable LLM evaluation:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Set `ADMIN_TOKEN` to protect upload, analyze, export, admin stats, and shortlist email actions. Leave it empty for local demos.

```bash
ADMIN_TOKEN=change-me
```

Shortlist email uses SMTP when configured. Without SMTP, the backend writes the email body to `data/outbox.log` so the workflow can still be tested locally.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend expects the API at `http://localhost:8000`. Override with `NEXT_PUBLIC_API_BASE` if needed.

## API

- `POST /upload-resumes`: multipart upload with one or more `files`.
- `POST /analyze`: body `{ "job_description": "...", "use_llm": true }`.
- `GET /results`: latest ranked screening run.
- `GET /results/export`: latest results as CSV.
- `GET /resumes`: uploaded resume inventory.
- `POST /shortlist/email`: email selected candidates through SMTP or local outbox fallback.
- `GET /admin/stats`: admin counters for resumes, runs, decisions, and results.
- `GET /health`: service health.

When `ADMIN_TOKEN` is set, send it as:

```bash
X-Admin-Token: change-me
```

Each result contains:

```json
{
  "name": "",
  "score": 0,
  "skills_matched": [],
  "skills_missing": [],
  "summary": "",
  "decision": "Selected",
  "resume_text": ""
}
```

## Sample Data

- Job description: `data/job_description.txt`
- Resume source text: `data/sample_resumes/*.txt`
- Generate uploadable sample PDFs and DOCX files:

```bash
python -m backend.utils.generate_sample_files
```

Upload the generated files from `data/sample_resumes/` through the dashboard.
