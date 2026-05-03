from pathlib import Path

from fastapi.testclient import TestClient

from backend.main import app


ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    with TestClient(app) as client:
        files = []
        for path in sorted((ROOT / "data" / "sample_resumes").glob("*.pdf")):
            files.append(("files", (path.name, path.read_bytes(), "application/pdf")))

        upload_response = client.post("/upload-resumes", files=files)
        upload_response.raise_for_status()

        jd = (ROOT / "data" / "job_description.txt").read_text(encoding="utf-8")
        analyze_response = client.post("/analyze", json={"job_description": jd, "use_llm": False})
        analyze_response.raise_for_status()
        payload = analyze_response.json()
        stats_response = client.get("/admin/stats")
        stats_response.raise_for_status()
        email_response = client.post(
            "/shortlist/email",
            json={"run_id": payload["run_id"], "recipient_email": "recruiting@example.com", "decision": "Selected"},
        )
        email_response.raise_for_status()
        email_payload = email_response.json()

    print(
        {
            "uploaded": len(upload_response.json()),
            "results": len(payload["results"]),
            "top_candidate": payload["results"][0]["name"],
            "top_score": payload["results"][0]["score"],
            "top_decision": payload["results"][0]["decision"],
            "stats_results": stats_response.json()["results"],
            "email_mode": email_payload["mode"],
            "emailed_candidates": email_payload["candidates"],
        }
    )


if __name__ == "__main__":
    main()
