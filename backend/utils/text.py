import re
from collections import Counter


STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have",
    "in", "is", "it", "of", "on", "or", "our", "that", "the", "to", "with", "you",
    "your", "we", "will", "this", "role", "candidate", "experience", "skills",
}


SKILL_CATALOG = [
    "python", "java", "javascript", "typescript", "react", "next.js", "node.js",
    "fastapi", "django", "flask", "sql", "postgresql", "mysql", "sqlite",
    "mongodb", "aws", "azure", "gcp", "docker", "kubernetes", "linux", "git",
    "ci/cd", "rest api", "graphql", "machine learning", "deep learning", "nlp",
    "llm", "openai", "langchain", "rag", "tensorflow", "pytorch", "scikit-learn",
    "pandas", "numpy", "spark", "data engineering", "etl", "airflow", "dbt",
    "tableau", "power bi", "excel", "statistics", "a/b testing", "product",
    "leadership", "communication", "stakeholder management", "agile", "scrum",
    "security", "oauth", "jwt", "microservices", "system design", "testing",
]

TECHNICAL_SKILLS = {
    "python", "java", "javascript", "typescript", "sql", "machine learning",
    "deep learning", "nlp", "llm", "rag", "data engineering", "statistics",
    "a/b testing", "security", "microservices", "system design", "testing",
}

SOFT_SKILLS = {
    "leadership", "communication", "stakeholder management", "agile", "scrum",
    "product",
}

TOOL_SKILLS = {
    "react", "next.js", "node.js", "fastapi", "django", "flask", "postgresql",
    "mysql", "sqlite", "mongodb", "aws", "azure", "gcp", "docker", "kubernetes",
    "linux", "git", "ci/cd", "rest api", "graphql", "openai", "langchain",
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "spark", "etl",
    "airflow", "dbt", "tableau", "power bi", "excel", "oauth", "jwt",
}


def normalize_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[\u2022\u25cf\u25e6]", " - ", text)
    return text.strip()


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z][a-zA-Z+#./-]{1,}", text.lower())


def extract_candidate_name(text: str, fallback: str) -> str:
    for line in text.splitlines()[:8]:
        cleaned = re.sub(r"[^A-Za-z .'-]", "", line).strip()
        if 2 <= len(cleaned.split()) <= 4 and len(cleaned) <= 60:
            lowered = cleaned.lower()
            if not any(term in lowered for term in ["resume", "curriculum", "email", "phone"]):
                return cleaned
    return fallback.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()


def extract_known_skills(text: str) -> list[str]:
    lowered = text.lower()
    found = []
    for skill in SKILL_CATALOG:
        pattern = r"(?<![a-z0-9])" + re.escape(skill.lower()) + r"(?![a-z0-9])"
        if re.search(pattern, lowered):
            found.append(skill)
    return sorted(set(found))


def extract_skill_categories(text: str) -> dict[str, list[str]]:
    skills = set(extract_known_skills(text))
    return {
        "technical": sorted(skills & TECHNICAL_SKILLS),
        "soft": sorted(skills & SOFT_SKILLS),
        "tools": sorted(skills & TOOL_SKILLS),
    }


def top_keywords(text: str, limit: int = 18) -> list[str]:
    words = [w for w in tokenize(text) if len(w) > 2 and w not in STOPWORDS]
    counts = Counter(words)
    return [word for word, _ in counts.most_common(limit)]


def clamp_score(score: float) -> float:
    return round(max(0.0, min(100.0, score)), 1)
