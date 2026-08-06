"""SQLAlchemy engine, session, and declarative base."""

from collections.abc import Generator
from datetime import datetime, timezone

from sqlalchemy import DateTime, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """Every table carries these. An audit system needs to know when rows changed."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency. One session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
