"""
Day-to-day operations: the queue, prep lists, devices, audio, announcements,
the audit log, and analytics.
"""

from __future__ import annotations

import uuid
from datetime import date as Date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db, utcnow
from app.deps import get_current_user, require_admin
from app.models import (
    Announcement,
    AuditLog,
    ClassroomDevice,
    Handover,
    HandoverMethod,
    NameAudio,
    PickupRequest,
    PickupStatus,
    SchoolClass,
    Student,
    Trip,
    User,
)
from app.schemas import PickupRequestOut

router = APIRouter()

# A display that has not checked in for this long is treated as offline. It
# stops announcing with no other symptom, so the dashboard is the only signal.
DEVICE_OFFLINE_AFTER = timedelta(minutes=3)


# ── queue ──────────────────────────────────────────────────────────────


@router.get("/queue", tags=["queue"])
def get_queue(
    class_id: uuid.UUID | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Live queue.

    Ordered by ETA among collectors who are actually on their way — never by
    booking time. A collector who booked 1:00 and left at 1:30 falls behind on
    their own, so there is no punitive rule to explain to anyone.

    One trip is ONE entry carrying every child on it. A van of six children
    appears once, in the same lane as everyone else.
    """
    today = Date.today()
    active = (
        PickupStatus.EN_ROUTE,
        PickupStatus.NEARBY,
        PickupStatus.AT_GATE,
        PickupStatus.SCHEDULED,
        PickupStatus.LAPSED,
    )

    rows = db.execute(
        select(PickupRequest, Student, SchoolClass, User, Trip)
        .join(Student, Student.id == PickupRequest.student_id)
        .join(SchoolClass, SchoolClass.id == Student.class_id)
        .join(User, User.id == PickupRequest.collector_id)
        .outerjoin(Trip, Trip.id == PickupRequest.trip_id)
        .where(
            PickupRequest.date == today,
            PickupRequest.status.in_(active),
            Student.school_id == user.school_id,
        )
    ).all()

    # Group by trip so a van is one entry, not six. Requests with no trip
    # (nobody has set off yet) group by their own id.
    trips: dict[str, dict] = {}
    for req, student, cls, collector, trip in rows:
        key = str(req.trip_id) if req.trip_id else f"req-{req.id}"
        entry = trips.setdefault(
            key,
            {
                "trip_id": str(req.trip_id) if req.trip_id else None,
                "collector_name": collector.name,
                "collector_role": collector.role.value,
                "status": req.status.value,
                "eta_seconds": trip.eta_seconds if trip else None,
                "_requests": [],
                "sibling_group": [],
            },
        )
        entry["_requests"].append((req, student, cls))
        entry["sibling_group"].append(
            {
                "student_id": str(student.id),
                "student_name": student.name,
                "class_name": cls.name,
            }
        )

    # Sort: AT_GATE first, then by ETA. Unknown ETA sorts last — someone who
    # has not started cannot be ahead of someone two minutes away.
    def sort_key(e: dict):
        at_gate = 0 if e["status"] == PickupStatus.AT_GATE.value else 1
        eta = e["eta_seconds"]
        return (at_gate, eta if eta is not None else 10**9)

    ordered = sorted(trips.values(), key=sort_key)

    out = []
    for position, entry in enumerate(ordered, start=1):
        for req, student, cls in entry["_requests"]:
            if class_id and cls.id != class_id:
                continue
            out.append(
                {
                    "pickup_request_id": str(req.id),
                    "trip_id": entry["trip_id"],
                    "student_id": str(student.id),
                    "student_name": student.name,
                    "class_id": str(cls.id),
                    "class_name": cls.name,
                    "collector_name": entry["collector_name"],
                    "collector_role": entry["collector_role"],
                    "status": req.status.value,
                    "eta_seconds": entry["eta_seconds"],
                    "position": position,
                    "sibling_group": entry["sibling_group"],
                }
            )
    return out


@router.get("/pickup-requests", response_model=list[PickupRequestOut], tags=["pickup-requests"])
def list_pickup_requests(
    class_id: uuid.UUID | None = None,
    date: Date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    The teacher's prep list, from today's bookings.

    This is NOT queue order — that comes from live ETA on /queue. Confusing the
    two is the mistake the whole design avoids.
    """
    stmt = (
        select(PickupRequest)
        .join(Student, Student.id == PickupRequest.student_id)
        .where(
            PickupRequest.date == (date or Date.today()),
            Student.school_id == user.school_id,
        )
    )
    if class_id:
        stmt = stmt.where(Student.class_id == class_id)
    rows = db.execute(stmt).scalars().all()
    return [PickupRequestOut.model_validate(r) for r in rows]


# ── devices & audio ────────────────────────────────────────────────────


@router.get("/devices", tags=["devices"])
def list_devices(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        select(ClassroomDevice, SchoolClass)
        .join(SchoolClass, SchoolClass.id == ClassroomDevice.class_id)
        .where(ClassroomDevice.school_id == user.school_id)
    ).all()
    now = utcnow()
    return [
        {
            "id": str(d.id),
            "school_id": str(d.school_id),
            "class_id": str(d.class_id),
            "class_name": c.name,
            "device_identifier": d.device_identifier,
            "paired_at": d.paired_at.isoformat() if d.paired_at else None,
            "last_seen_at": d.last_seen_at.isoformat() if d.last_seen_at else None,
            "online": bool(d.last_seen_at and (now - d.last_seen_at) < DEVICE_OFFLINE_AFTER),
        }
        for d, c in rows
    ]


@router.post("/devices/{device_id}/heartbeat", status_code=204, tags=["devices"])
def device_heartbeat(device_id: uuid.UUID, db: Session = Depends(get_db)):
    device = db.get(ClassroomDevice, device_id)
    if device is not None:
        device.last_seen_at = utcnow()
        db.commit()
    return None


@router.get("/name-audio", tags=["devices"])
def list_name_audio(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(select(NameAudio)).scalars().all()
    return [
        {
            "id": str(r.id),
            "subject_type": r.subject_type.value,
            "subject_id": str(r.subject_id),
            "audio_url": r.audio_url,
            "duration_ms": r.duration_ms,
        }
        for r in rows
    ]


# ── announcements, audit, analytics ────────────────────────────────────


@router.get("/announcements", tags=["announcements"])
def list_announcements(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    rows = db.execute(
        select(Announcement)
        .where(Announcement.school_id == user.school_id)
        .order_by(Announcement.created_at.desc())
    ).scalars().all()
    return [
        {
            "id": str(a.id),
            "school_id": str(a.school_id),
            "title_en": a.title_en,
            "title_ur": a.title_ur,
            "body_en": a.body_en,
            "body_ur": a.body_ur,
            "sent_at": a.sent_at.isoformat() if a.sent_at else None,
            "audience": a.audience.value,
            "class_id": str(a.class_id) if a.class_id else None,
        }
        for a in rows
    ]


@router.get("/audit-log", tags=["audit"])
def list_audit_log(
    flagged_only: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    stmt = select(AuditLog, User).outerjoin(User, User.id == AuditLog.actor_user_id).where(
        AuditLog.school_id == admin.school_id
    )
    if flagged_only:
        stmt = stmt.where(AuditLog.flagged.is_(True))
    rows = db.execute(
        stmt.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    ).all()
    return [
        {
            "id": str(log.id),
            "school_id": str(log.school_id),
            "actor_user_id": str(log.actor_user_id) if log.actor_user_id else None,
            "actor_name": actor.name if actor else "system",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": str(log.entity_id) if log.entity_id else None,
            "payload": log.payload,
            "flagged": log.flagged,
            "created_at": log.created_at.isoformat(),
        }
        for log, actor in rows
    ]


@router.get("/analytics/on-time-rate", tags=["analytics"])
def on_time_rate(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    total = db.execute(select(func.count(Handover.id))).scalar() or 0
    manual = (
        db.execute(
            select(func.count(Handover.id)).where(
                Handover.method == HandoverMethod.manual
            )
        ).scalar()
        or 0
    )
    handed = (
        db.execute(
            select(func.count(PickupRequest.id)).where(
                PickupRequest.status == PickupStatus.HANDED_OVER
            )
        ).scalar()
        or 0
    )
    lapsed = (
        db.execute(
            select(func.count(PickupRequest.id)).where(
                PickupRequest.status == PickupStatus.LAPSED
            )
        ).scalar()
        or 0
    )
    denom = handed + lapsed
    return {
        "on_time_rate": round(handed / denom, 3) if denom else 0.0,
        "total_pickups": total,
        "manual_fallback_rate": round(manual / total, 3) if total else 0.0,
    }


@router.get("/analytics/wait-times", tags=["analytics"])
def wait_times(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """
    Wait time = gate arrival to handover.

    Returns empty series until enough handovers exist to mean anything —
    better than a chart of one point pretending to be a trend.
    """
    rows = db.execute(
        select(Trip.arrived_at, Handover.verified_at)
        .join(PickupRequest, PickupRequest.trip_id == Trip.id)
        .join(Handover, Handover.pickup_request_id == PickupRequest.id)
        .where(Trip.arrived_at.is_not(None))
    ).all()

    waits = [
        int((verified - arrived).total_seconds())
        for arrived, verified in rows
        if arrived and verified and verified >= arrived
    ]
    waits.sort()
    avg = int(sum(waits) / len(waits)) if waits else 0
    median = waits[len(waits) // 2] if waits else 0

    by_minute = db.execute(
        select(
            func.to_char(Trip.arrived_at, "HH24:MI").label("minute"),
            func.count(Trip.id),
        )
        .where(Trip.arrived_at.is_not(None))
        .group_by("minute")
        .order_by("minute")
    ).all()

    return {
        "average_wait_seconds": avg,
        "median_wait_seconds": median,
        "by_day": [],
        "peak_minutes": [{"minute": m, "count": c} for m, c in by_minute],
    }
