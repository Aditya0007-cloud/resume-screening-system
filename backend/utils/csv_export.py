import csv
import io


def results_to_csv(results: list[dict]) -> str:
    stream = io.StringIO()
    writer = csv.DictWriter(
        stream,
        fieldnames=[
            "name",
            "filename",
            "score",
            "baseline_score",
            "llm_score",
            "decision",
            "skills_matched",
            "skills_missing",
            "summary",
        ],
    )
    writer.writeheader()
    for result in results:
        writer.writerow(
            {
                "name": result["name"],
                "filename": result["filename"],
                "score": result["score"],
                "baseline_score": result["baseline_score"],
                "llm_score": result["llm_score"],
                "decision": result["decision"],
                "skills_matched": ", ".join(result["skills_matched"]),
                "skills_missing": ", ".join(result["skills_missing"]),
                "summary": result["summary"],
            }
        )
    return stream.getvalue()
