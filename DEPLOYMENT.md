# Deployment Guide

This project is deployment-ready as two services:

- Frontend: Next.js dashboard on Vercel
- Backend: FastAPI API on Render or Railway

The app can already be deployed; use this guide when updating production configuration.

## 1. Production Environment Checklist

- Set `ADMIN_TOKEN` for protected upload, analysis, export, report, and preview routes.
- Set `OPENAI_API_KEY` only if you want AI-assisted scoring.
- Set `CORS_ORIGINS` to your deployed frontend URL.
- Set `NEXT_PUBLIC_API_BASE` to your deployed backend URL.
- Use persistent storage or a managed database for production resume uploads/results.

## 2. Frontend: Vercel

Vercel settings:

```text
Root Directory: frontend
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

Environment variables:

```env
NEXT_PUBLIC_API_BASE=https://your-backend-url.onrender.com
```

After deployment, confirm:

```text
https://your-vercel-app.vercel.app
```

## 3. Backend: Render

The repository includes `render.yaml`.

Manual Render settings:

```text
Environment: Python
Build Command: pip install -r requirements.txt
Start Command: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
Health Check Path: /health
```

Environment variables:

```env
APP_NAME=AI Resume Screening & ATS Analyzer
DATABASE_URL=sqlite:///./data/resume_screening.db
UPLOAD_DIR=data/uploads
CORS_ORIGINS=["https://your-vercel-app.vercel.app"]
ADMIN_TOKEN=replace-with-a-secure-token
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

For long-term production usage, replace SQLite with a managed database and persistent file storage.

## 4. Backend: Railway

The repository includes `railway.json`.

Railway settings:

```text
Start Command: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
Health Check Path: /health
```

Environment variables are the same as Render.

## 5. CORS

During local development, CORS allows:

```text
http://localhost:3000
http://127.0.0.1:3000
```

In production, set:

```env
CORS_ORIGINS=["https://your-vercel-app.vercel.app"]
```

## 6. Smoke Tests

Backend health:

```bash
curl https://your-backend-url/health
```

Expected response:

```json
{"status":"ok"}
```

Frontend production build:

```bash
cd frontend
npm install
npm run build
```

Backend import/database check:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -c "from backend.database import init_db; init_db(); print('database ok')"
```

## 7. Production Notes

- Keep `.env` and `frontend/.env.local` out of Git.
- Do not commit uploaded resumes or generated database files.
- Rotate `ADMIN_TOKEN` if it has been shared publicly.
- Add screenshots to `assets/screenshots/` after each major UI update.
- Consider PostgreSQL or MongoDB for a full SaaS production version.
