import json
from typing import Any

from openai import OpenAI

from backend.config import get_settings
from backend.utils.text import clamp_score


EVALUATION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "score": {"type": "number"},
        "skills_matched": {"type": "array", "items": {"type": "string"}},
        "skills_missing": {"type": "array", "items": {"type": "string"}},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "weaknesses": {"type": "array", "items": {"type": "string"}},
        "summary": {"type": "string"},
    },
    "required": ["score", "skills_matched", "skills_missing", "strengths", "weaknesses", "summary"],
    "additionalProperties": False,
}


def evaluate_with_openai(
    resume_text: str,
    job_description: str,
    job_analysis: dict,
) -> dict | None:
    settings = get_settings()
    if not settings.openai_api_key:
        return None

    client = OpenAI(api_key=settings.openai_api_key)
    prompt = {
        "job_description": job_description[:12000],
        "job_analysis": job_analysis,
        "resume": resume_text[:16000],
        "instructions": (
            "Evaluate the resume against the job description. Score strictly from 0 to 100. "
            "Reward directly evidenced skills and experience, penalize missing required skills, "
            "and keep all lists concise."
        ),
    }

    try:
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": "You are a careful technical recruiter. Return JSON only.",
                },
                {"role": "user", "content": json.dumps(prompt)},
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "resume_evaluation",
                    "schema": EVALUATION_SCHEMA,
                    "strict": True,
                }
            },
        )
        parsed = json.loads(response.output_text)
        parsed["score"] = clamp_score(float(parsed.get("score", 0)))
        return parsed
    except Exception:
        return None
