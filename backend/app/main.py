"""
Rukhsat API.

Every route lives under /v1 to match `docs/api/openapi.yaml`.
"""

from contextlib import asynccontextmanager
from pathlib import Path

import redis
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.db import engine
from app.routers import (
    auth,
    collectors,
    devices,
    handovers,
    operations,
    passes,
    people,
    qr,
    registration,
    trips,
    ws,
)
from app.schemas import HealthOut

scheduler = BackgroundScheduler(timezone="Asia/Karachi")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """
    APScheduler rather than Celery: two job types do not justify a broker and
    a worker process on a 1.9GB box.

    Runs at 00:15 local so it lands after midnight but well before the school
    day. `coalesce` and `misfire_grace_time` matter on a small instance — if
    the box is briefly busy the job should still run once, not be skipped
    silently and leave the next morning empty.
    """
    from app.jobs.generate_requests import run_nightly
    from app.jobs.reminders import run_morning

    scheduler.add_job(
        run_nightly,
        CronTrigger(hour=0, minute=15),
        id="generate_pickup_requests",
        replace_existing=True,
        coalesce=True,
        misfire_grace_time=3600,
    )
    # Reminders go out mid-morning, not at dawn: a 7am notification is read
    # and forgotten before it matters, and a parent who needs to change who is
    # collecting still has hours to do it. Both workers run this job — the
    # Redis claim inside it is what keeps delivery to exactly once.
    scheduler.add_job(
        run_morning,
        CronTrigger(hour=10, minute=0, day_of_week="mon-fri"),
        id="pickup_reminders",
        replace_existing=True,
        coalesce=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)


app = FastAPI(
    lifespan=lifespan,
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

MEDIA_ROOT = Path("media")
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_ROOT), name="media")

V1 = "/v1"
app.include_router(auth.router, prefix=V1)
app.include_router(people.router, prefix=V1)
app.include_router(collectors.router, prefix=V1)
app.include_router(operations.router, prefix=V1)
app.include_router(trips.router, prefix=V1)
app.include_router(handovers.router, prefix=V1)
app.include_router(registration.router, prefix=V1)
app.include_router(qr.router, prefix=V1)
app.include_router(ws.router, prefix=V1)
app.include_router(devices.router, prefix=V1)
app.include_router(passes.router, prefix=V1)


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
