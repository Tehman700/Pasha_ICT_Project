"""
Pytest fixtures.

Tests run against the real local Postgres, not SQLite. The schema uses
Postgres-specific types (JSONB, native ENUMs, UUID) and the whole point of
pinning the local version to production's is that a migration which passes
here passes there.

Each test runs inside a transaction that is rolled back afterwards, so tests
never see each other's writes and the seeded demo data survives.
"""

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.config import settings  # noqa: E402
from app.db import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Role, School, User  # noqa: E402
from app.security import hash_password  # noqa: E402

TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", settings.database_url)


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DB_URL, pool_pre_ping=True)
    try:
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        pytest.exit(
            f"Cannot reach the test database at {TEST_DB_URL.split('@')[-1]}.\n"
            f"Start it with `pnpm db:up`.\n({type(exc).__name__}: {exc})",
            returncode=1,
        )
    Base.metadata.create_all(eng)
    return eng


@pytest.fixture
def db(engine):
    """A session wrapped in a transaction that is always rolled back."""
    connection = engine.connect()
    trans = connection.begin()
    TestingSession = sessionmaker(bind=connection, autoflush=False, expire_on_commit=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        connection.close()


@pytest.fixture
def client(db: Session):
    """TestClient sharing the test's rolled-back session."""

    def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def school(db: Session) -> School:
    import uuid
    from datetime import time

    s = School(
        id=uuid.uuid4(),
        name="Test School",
        lat=33.6844,
        lng=73.0479,
        geofence_radius_m=1000,
        dismissal_time=time(13, 15),
        timezone="Asia/Karachi",
    )
    db.add(s)
    db.flush()
    return s


@pytest.fixture
def make_user(db: Session, school: School):
    """Factory for users with a known password."""
    import uuid

    counter = {"n": 0}

    def _make(role: Role = Role.parent, password: str = "testpass123", **kwargs) -> User:
        counter["n"] += 1
        u = User(
            id=uuid.uuid4(),
            school_id=school.id,
            role=role,
            name=kwargs.get("name", f"Test {role.value} {counter['n']}"),
            # Canonical 03xxxxxxxxx — the shape production stores after
            # scripts/normalise_phones.py, so login's normalisation finds them.
            phone=kwargs.get("phone", f"03000{counter['n']:06d}"),
            password_hash=hash_password(password),
            locale=kwargs.get("locale", "en"),
        )
        db.add(u)
        db.flush()
        return u

    return _make


@pytest.fixture
def auth_headers(client, make_user):
    """Factory returning Authorization headers for a freshly created user."""

    def _headers(role: Role = Role.parent, password: str = "testpass123"):
        user = make_user(role=role, password=password)
        resp = client.post(
            "/v1/auth/login", json={"phone": user.phone, "password": password}
        )
        assert resp.status_code == 200, resp.text
        return {"Authorization": f"Bearer {resp.json()['access_token']}"}, user

    return _headers
