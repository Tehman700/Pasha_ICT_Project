"""
Morning-of pickup reminders.

The schedule is the backstop for the whole system — geofences fire late or not
at all on the phones this market actually uses. This job is what makes the
backstop visible: a parent is told, before the school day ends, who is
supposed to be collecting and when.

Runs once each school morning rather than at a fixed interval before each
pickup. A staggered per-request reminder would need a job per row and would
fire at 40 different times across a 90-minute dismissal; one morning digest
does the job and costs one scan.

**Deduplication is not optional here.** Two uvicorn workers each run their own
APScheduler, so without a lock every parent gets every reminder twice. Unlike
`generate_requests`, sending is not idempotent — a push cannot be un-sent.
A Redis key claimed with SET NX is what makes exactly-once hold, and if Redis
is unavailable the job declines to run at all rather than risk doubling.
"""

from __future__ import annotations

import logging
from datetime import date as Date

import redis
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.models import PickupRequest, PickupStatus, User
from app.services import notify, push

log = logging.getLogger(__name__)

#: Long enough that a worker restarting mid-morning cannot re-send, short
#: enough that the key is gone well before the same job runs tomorrow.
LOCK_TTL_SECONDS = 12 * 3600


def _claim(key: str) -> bool:
    """
    True if this worker is the one that gets to send.

    Returns False when Redis is down. That is deliberate: a silent day of
    missing reminders is recoverable, a day of doubled ones erodes trust in
    every notification the system sends afterwards.
    """
    try:
        client = redis.from_url(settings.redis_url, socket_connect_timeout=2)
        return bool(client.set(key, "1", nx=True, ex=LOCK_TTL_SECONDS))
    except Exception as exc:  # noqa: BLE001
        log.warning("reminder lock unavailable, skipping to avoid duplicates: %s", exc)
        return False


def _time_label(request: PickupRequest, locale: str) -> str:
    """
    `1:45 PM`. Urdu keeps Latin digits — Urdu speakers here read both, and
    Nastaliq numerals in a lock-screen notification are a legibility risk.

    Formatted by hand rather than with `%-I`, which is glibc-only: the same
    format string raises on Windows, where the tests run.
    """
    t = request.scheduled_time
    hour = t.hour % 12 or 12
    suffix = "AM" if t.hour < 12 else "PM"
    return f"{hour}:{t.minute:02d} {suffix}"


def send_reminders_for(db: Session, target: Date) -> dict[str, int]:
    """Notify guardians of every pickup still scheduled for `target`."""
    if not push.enabled():
        return {"sent": 0, "considered": 0, "skipped": "push disabled"}  # type: ignore[dict-item]

    requests = db.execute(
        select(PickupRequest).where(
            PickupRequest.date == target,
            # A child already en route or handed over needs no reminder, and a
            # cancelled one would be actively wrong.
            PickupRequest.status == PickupStatus.SCHEDULED,
        )
    ).scalars().all()

    sent = 0
    for req in requests:
        if not _claim(f"rukhsat:reminder:{target.isoformat()}:{req.id}"):
            continue

        collector = db.get(User, req.collector_id)
        locale = collector.locale if collector else "en"
        sent += notify.notify_reminder(
            db,
            student_id=req.student_id,
            time_label=_time_label(req, locale or "en"),
            request_id=req.id,
        )

    return {"sent": sent, "considered": len(requests)}


def run_morning() -> dict[str, int]:
    """Entry point for the scheduler."""
    with SessionLocal() as db:
        return send_reminders_for(db, Date.today())


if __name__ == "__main__":
    result = run_morning()
    print(f"sent {result['sent']} reminders across {result['considered']} pickups")
