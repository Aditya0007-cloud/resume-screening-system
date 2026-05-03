from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from backend.utils.text import clamp_score, extract_known_skills


def baseline_scores(job_description: str, resumes: list[str]) -> list[float]:
    if not resumes:
        return []
    corpus = [job_description, *resumes]
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=6000)
    matrix = vectorizer.fit_transform(corpus)
    similarities = cosine_similarity(matrix[0:1], matrix[1:]).flatten()
    return [clamp_score(float(value) * 100) for value in similarities]


def skill_gap(job_skills: list[str], resume_text: str) -> tuple[list[str], list[str]]:
    resume_skills = set(extract_known_skills(resume_text))
    matched = sorted(skill for skill in job_skills if skill in resume_skills)
    missing = sorted(skill for skill in job_skills if skill not in resume_skills)
    return matched, missing


def heuristic_llm_like_score(
    baseline: float,
    matched_required: list[str],
    missing_required: list[str],
    matched_preferred: list[str],
    total_required: int,
    total_preferred: int,
) -> float:
    required_ratio = len(matched_required) / max(total_required, 1)
    preferred_ratio = len(matched_preferred) / max(total_preferred, 1)
    penalty = min(18, len(missing_required) * 4)
    return clamp_score((baseline * 0.35) + (required_ratio * 48) + (preferred_ratio * 22) - penalty + 8)
