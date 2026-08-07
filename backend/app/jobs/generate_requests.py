"""
Nightly generation of the next day's pickup requests.

Parents set a weekly schedule once; this turns it into concrete rows. Asking a
parent to re-book every evening is the friction that kills adoption, and it is
the reason the whole model is recurring rather than per-day.

This job is also what stops the system going quietly empty. Without it, the
data is correct on the day it was seeded and blank the morning after — which
is exactly how a demo dies in front of judges.

Idempotent: safe to run repeatedly, and safe to run late. It never overwrites a
request someone has already acted on.
"""

from __future__ import annotations

import uuid
from datetime import date as Date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal, utcnow
from app.models import (
    AuditLog,
    PickupRequest,
    PickupStatus,
    RequestSource,
    Schedule,
    School,
    Student,
)


def generate_for_date(db: Session, target: Date) -> dict[str, int]:
    """
    Create pickup requests for `target` from the recurring weekly schedules.

    Returns counts so the caller can log something meaningful rather than
    "job ran".
    """
    weekday = target.weekday()  # 0 = Monday, matching Schedule.weekday

    schedules = db.execute(
        select(Schedule, Student)
        .join(Student, Student.id == Schedule.student_id)
        .where(Schedule.weekday == weekday)
    ).all()

    existing = {
        sid
        for sid in db.execute(
            select(PickupRequest.student_id).where(PickupRequest.date == target)
        ).scalars().all()
    }

    created = 0
    skipped = 0

    for schedule, student in schedules:
        # A row already exists — either this job ran before, or the parent set
        # an exception for this day. Either way it is not ours to overwrite;
        # an exception the parent deliberately made must survive the job.
        if student.id in existing:
            skipped += 1
            continue

        db.add(
            PickupRequest(
                id=uuid.uuid4(),
                student_id=student.id,
                collector_id=schedule.collector_id,
                date=target,
                scheduled_time=schedule.pickup_time,
                status=PickupStatus.SCHEDULED,
                source=RequestSource.default,
            )
        )
        existing.add(student.id)
        created += 1

    if created:
        school_id = db.execute(select(School.id)).scalars().first()
        if school_id:
            db.add(
                AuditLog(
                    id=uuid.uuid4(),
                    school_id=school_id,
                    actor_user_id=None,  # the system, not a person
                    action="pickup_requests.generated",
                    entity_type="pickup_request",
                    entity_id=None,
                    payload={
                        "date": target.isoformat(),
                        "created": created,
                        "skipped": skipped,
                    },
                    flagged=False,
                    created_at=utcnow(),
                )
            )

    db.commit()
    return {"created": created, "skipped": skipped, "weekday": weekday}


def lapse_stale_requests(db: Session, target: Date, grace_minutes: int = 20) -> int:
    """
    Mark requests LAPSED when nobody set off within the grace window.

    LAPSED is not a punishment — it just means "not currently in the queue".
    The moment the collector taps On my way, the request re-enters as EN_ROUTE
    and takes its place by live ETA like anyone else. That is why no explicit
    back-of-the-queue rule is needed anywhere.
    """
    now = utcnow()
    rows = db.execute(
        select(PickupRequest).where(
            PickupRequest.date == target,
            PickupRequest.status == PickupStatus.SCHEDULED,
        )
    ).scalars().all()

    lapsed = 0
    for req in rows:
        due = now.replace(
            hour=req.scheduled_time.hour,
            minute=req.scheduled_time.minute,
            second=0,
            microsecond=0,
        )
        if now > due + timedelta(minutes=grace_minutes):
            req.status = PickupStatus.LAPSED
            lapsed += 1

    if lapsed:
        db.commit()
    return lapsed


def run_nightly() -> dict[str, int]:
    """Entry point for the scheduler. Generates tomorrow, then today as a safety net."""
    with SessionLocal() as db:
        tomorrow = generate_for_date(db, Date.today() + timedelta(days=1))
        # If the box was asleep or the job failed last night, today would be
        # empty. Generating it too costs nothing when the rows already exist.
        today = generate_for_date(db, Date.today())
        return {
            "tomorrow_created": tomorrow["created"],
            "today_created": today["created"],
            "today_skipped": today["skipped"],
        }


if __name__ == "__main__":
    result = run_nightly()
    print(
        f"created {result['tomorrow_created']} for tomorrow, "
        f"{result['today_created']} for today "
        f"({result['today_skipped']} already existed)"
    )
