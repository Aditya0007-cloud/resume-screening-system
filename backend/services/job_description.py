import re

from backend.utils.text import extract_known_skills, top_keywords


def analyze_job_description(job_description: str) -> dict:
    required_context = _section_text(job_description, ["required", "must have", "minimum"])
    preferred_context = _section_text(job_description, ["preferred", "nice to have", "bonus"])

    all_skills = extract_known_skills(job_description)
    required = extract_known_skills(required_context) if required_context else []
    preferred = extract_known_skills(preferred_context) if preferred_context else []

    if not required:
        required = all_skills[: max(1, min(8, len(all_skills)))]
    if not preferred:
        preferred = [skill for skill in all_skills if skill not in required][:8]

    return {
        "required_skills": required,
        "preferred_skills": preferred,
        "experience_level": _extract_experience_level(job_description),
        "keywords": top_keywords(job_description),
    }


def _section_text(text: str, anchors: list[str]) -> str:
    lines = text.splitlines()
    selected = []
    capture = False
    for line in lines:
        lower = line.lower()
        if any(anchor in lower for anchor in anchors):
            capture = True
        elif capture and re.search(r"^\s*(responsibilities|about|benefits|what you|compensation)\b", lower):
            capture = False
        if capture:
            selected.append(line)
    return "\n".join(selected)


def _extract_experience_level(text: str) -> str:
    match = re.search(r"(\d+)\+?\s*(?:-|to)?\s*(\d+)?\+?\s+years?", text, re.IGNORECASE)
    if match:
        if match.group(2):
            return f"{match.group(1)}-{match.group(2)} years"
        return f"{match.group(1)}+ years"

    lowered = text.lower()
    if any(term in lowered for term in ["senior", "lead", "principal", "staff"]):
        return "Senior"
    if any(term in lowered for term in ["junior", "entry level", "graduate"]):
        return "Junior"
    return "Not specified"
