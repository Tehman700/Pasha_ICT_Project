"""
Test fixtures.

Runs against the real local Postgres — not SQLite. The schema uses Postgres
ENUMs, JSONB and UUID columns, so a SQLite test suite would pass while the
production database rejected the same statements.
"""

import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.db import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import School, User  # noqa: E402

SEED = BACKEND.parent / "scripts" / "seed.py"
DEMO_PASSWORD = "rukhsat123"


@pytest.fixture(scope="session", autouse=True)
def seeded_database() -> None:
    """Reseed once per session so every test sees the same known dataset."""
    result = subprocess.run(
        [sys.executable, str(SEED), "--reset"],
        capture_output=True,
        text=True,
        cwd=str(BACKEND),
    )
    if result.returncode != 0:
        pytest.fail(f"seed failed:\n{result.stdout}\n{result.stderr}")


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def school(db) -> School:
    return db.execute(select(School)).scalars().one()


def _login(client: TestClient, phone: str) -> str:
    resp = client.post(
        "/v1/auth/login", json={"phone": phone, "password": DEMO_PASSWORD}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture
def admin_token(client) -> str:
    return _login(client, "+923001112233")


@pytest.fixture
def teacher_token(client) -> str:
    return _login(client, "+923004445566")


@pytest.fixture
def guard_token(client) -> str:
    return _login(client, "+923007778899")


@pytest.fixture
def parent_token(client) -> str:
    return _login(client, "+923331000001")


@pytest.fixture
def driver_token(client) -> str:
    return _login(client, "+923215000011")


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
