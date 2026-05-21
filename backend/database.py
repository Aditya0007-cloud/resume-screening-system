from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from backend.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from backend.models.entities import Resume, ScreeningResult, ScreeningRun  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_screening_result_columns()


def _ensure_screening_result_columns() -> None:
    """Add new analytics columns for existing local SQLite databases."""
    if not settings.database_url.startswith("sqlite"):
        return

    existing = {column["name"] for column in inspect(engine).get_columns("screening_results")}
    columns = {
        "ats_breakdown": "'{}'",
        "technical_skills": "'[]'",
        "soft_skills": "'[]'",
        "tools": "'[]'",
        "recommended_improvements": "'[]'",
    }
    with engine.begin() as connection:
        for name, default in columns.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE screening_results ADD COLUMN {name} TEXT NOT NULL DEFAULT {default}"))
