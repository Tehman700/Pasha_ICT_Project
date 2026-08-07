"""
Rukhsat API.

Every route lives under /v1 to match `docs/api/openapi.yaml`.
"""

import redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.db import engine
from app.routers import auth, collectors, handovers, operations, people, trips
from app.schemas import HealthOut

app = FastAPI(
    title="Rukhsat API",
    description="School pickup queue and verification system.",
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

V1 = "/v1"
app.include_router(auth.router, prefix=V1)
app.include_router(people.router, prefix=V1)
app.include_router(collectors.router, prefix=V1)
app.include_router(operations.router, prefix=V1)
app.include_router(trips.router, prefix=V1)
app.include_router(handovers.router, prefix=V1)


@app.get("/health", response_model=HealthOut, tags=["ops"])
def health() -> HealthOut:
    """
    Liveness plus dependency status.

    Reports degraded rather than failing outright — the deploy check needs to
    tell "the app is down" apart from "Redis is down".
    """
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        db_status = f"error: {type(exc).__name__}"

    redis_status = "ok"
    try:
        redis.from_url(settings.redis_url, socket_connect_timeout=2).ping()
    except Exception as exc:  # noqa: BLE001
        redis_status = f"error: {type(exc).__name__}"

    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"
    return HealthOut(
        status=overall,
        database=db_status,
        redis=redis_status,
        environment=settings.environment,
    )
