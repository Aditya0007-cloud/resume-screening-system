# 🤖 AI Resume Screening & ATS Analyzer

![Next.js](https://img.shields.io/badge/Frontend-Next.js-black?logo=nextdotjs)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38BDF8?logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![OpenAI Ready](https://img.shields.io/badge/AI-OpenAI_ready-412991)
![License](https://img.shields.io/badge/License-MIT-green)

A production-style AI resume screening platform that helps recruiters upload resumes, compare them against a job description, calculate ATS compatibility, extract skills, rank candidates, and review explainable hiring insights from a modern dashboard.

## ✨ Features

- 📄 Drag-and-drop PDF/DOCX resume upload
- 🎯 ATS compatibility score out of 100
- 🧠 Optional OpenAI-powered resume evaluation
- 🔍 Job description matching with missing skills and improvement suggestions
- 🧩 Technical skills, soft skills, and tools/framework extraction
- 🏆 Candidate ranking with top-candidate visibility
- 📊 Analytics charts for score distribution, skill frequency, and ranking
- 🧾 Resume preview with highlighted job signals
- 📬 Shortlist email workflow with local outbox fallback
- 📤 CSV export for screening results
- 🌙 Dark mode and responsive recruiter dashboard
- 🔐 Optional admin token protection

## 🧱 Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Resume Parsing | pdfplumber, PyPDF2, python-docx |
| Scoring | TF-IDF, heuristic ATS scoring, optional OpenAI evaluation |
| Database | SQLite by default via `DATABASE_URL` for beginner-friendly local setup |
| Deployment | Vercel frontend, Render/Railway backend |

## 🖼️ Screenshots

> Add screenshots after running the app locally.

| Dashboard | Candidate Detail | Analytics |
| --- | --- | --- |
| `docs/screenshots/dashboard.png` | `docs/screenshots/candidate-detail.png` | `docs/screenshots/analytics.png` |

## 🚀 Installation

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd "AI Resume screening system"
```

### 2. Backend setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m backend.utils.generate_sample_files
uvicorn backend.main:app --reload --port 8000
```

The API will run at:

```text
http://localhost:8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## ⚙️ Environment Variables

Create `.env` in the project root:

```env
APP_NAME="AI Resume Screening & ATS Analyzer"
DATABASE_URL=sqlite:///./data/resume_screening.db
UPLOAD_DIR=data/uploads
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
ADMIN_TOKEN=

SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
EMAIL_FROM=recruiting@example.com
OUTBOX_PATH=data/outbox.log
```

For the frontend, set this in `frontend/.env.local` or your Vercel project:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## 🧪 Usage

1. Start the backend and frontend.
2. Upload one or more PDF/DOCX resumes.
3. Paste a job description in the dashboard.
4. Click **Analyze**.
5. Review ATS scores, missing skills, extracted skills, rankings, and charts.
6. Export results as CSV or email shortlisted candidates.

If `OPENAI_API_KEY` is empty, the app still works using deterministic local ATS scoring.

## 📡 API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Backend health check |
| `POST` | `/upload-resumes` | Upload PDF/DOCX resumes |
| `POST` | `/analyze` | Run ATS and candidate ranking analysis |
| `GET` | `/results` | Get latest analysis results |
| `GET` | `/results/export` | Download latest results as CSV |
| `GET` | `/resumes` | List uploaded resumes |
| `POST` | `/shortlist/email` | Email shortlisted candidates |
| `GET` | `/admin/stats` | Dashboard counters |

## 📁 Folder Structure

```text
.
├── backend/
│   ├── api/                 # FastAPI routes and auth
│   ├── models/              # SQLAlchemy database models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── services/            # ATS scoring, parsing, matching, AI evaluation
│   ├── utils/               # Text helpers, CSV export, sample generation
│   ├── config.py            # Environment-based settings
│   ├── database.py          # Database engine/session setup
│   └── main.py              # FastAPI app entrypoint
├── data/
│   ├── sample_resumes/      # Demo resumes
│   └── job_description.txt  # Demo job description
├── frontend/
│   ├── app/                 # Next.js app routes and global styles
│   ├── components/          # Reusable React components
│   └── lib/                 # API client helpers
├── .env.example
├── requirements.txt
└── README.md
```

## ☁️ Deployment

### Frontend on Vercel

1. Import the repository into Vercel.
2. Set the root directory to `frontend`.
3. Add environment variable:

```env
NEXT_PUBLIC_API_BASE=https://your-backend-url.onrender.com
```

4. Deploy with the default Next.js build command:

```bash
npm run build
```

### Backend on Render or Railway

Use these settings:

```text
Build command: pip install -r requirements.txt
Start command: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

Recommended environment variables:

```env
DATABASE_URL=sqlite:///./data/resume_screening.db
ADMIN_TOKEN=your-secure-token
OPENAI_API_KEY=your-openai-key
CORS_ORIGINS=["https://your-vercel-app.vercel.app"]
```

For persistent production data, use a managed database and update `DATABASE_URL`.

## 🛣️ Future Enhancements

- User authentication and recruiter workspaces
- MongoDB or PostgreSQL production storage option
- Downloadable ATS report PDF
- Resume red-flag detection and bias checks
- Candidate notes and pipeline stages
- Role templates for faster job-description entry
- Automated screenshot gallery for GitHub

## 🤝 Contributing

Contributions are welcome.

1. Fork the project.
2. Create a feature branch.
3. Make your changes with clear commits.
4. Run backend and frontend checks.
5. Open a pull request with a short explanation and screenshots when UI changes are included.

## 📄 License

This project is released under the MIT License. You can use it for learning, portfolio projects, and further product development.
