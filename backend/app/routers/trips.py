"""
Trips: "On my way", the location stream, and ending a trip.

One trip covers every child this collector fetches today. For a parent that is
their own children; for a driver it spans many families and often several
classes. The trip completes only when every linked request is HANDED_OVER.

Location handling here is FOREGROUND-ONLY by design. The app streams while the
screen is open and stops on handover or after 90 minutes. Server-side geofence
evaluation is what lets the apps avoid ACCESS_BACKGROUND_LOCATION entirely —
the single biggest Play Store review risk in the project.
"""

from __future__ import annotations

import json
import time as time_mod
import uuid
from datetime import date as Date, timedelta

import redis
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db, utcnow
from app.deps import get_current_user
from app.models import (
    PickupRequest,
    PickupStatus,
    School,
    SchoolClass,
    SpokenAnnouncement,
    Student,
    Trip,
    User,
)
from app.schemas import LocationPing, TripOut
from app.services import broadcast, notify
from app.services.eta import Fix, estimate, should_announce
from app.services.routing import road_ratio

router = APIRouter()

# Raw fixes live in Redis, not Postgres. They are high-frequency, short-lived,
# and privacy-sensitive: SECURITY.md requires raw location history to be purged
# after 24h, and only entered_geofence_at / arrived_at retained long-term. A
# TTL on the key enforces that automatically rather than relying on a job.
FIX_TTL_SECONDS = 24 * 3600
MAX_FIXES = 40


def _redis() -> redis.Redis | None:
    try:
        return redis.from_url(settings.redis_url, socket_connect_timeout=2)
    except Exception:  # noqa: BLE001
        # A trip must not fail because the cache is down; ETA degrades to the
        # default speed instead.
        return None


def _fix_key(trip_id: uuid.UUID) -> str:
    return f"rukhsat:trip:{trip_id}:fixes"


def _ratio_key(trip_id: uuid.UUID) -> str:
    return f"rukhsat:trip:{trip_id}:road_ratio"


def _read_ratio(trip_id: uuid.UUID) -> float:
    """
    The road/straight-line ratio measured once when the trip started.

    Redis rather than a column: this is per-trip, expires with the trip, and is
    recoverable by simply asking TomTom again. Adding a migration to a live
    database for a cached float would be the wrong trade.

    Missing, unparseable, or Redis down all mean 1.0 - the straight-line
    behaviour this system had before, which is correct rather than merely safe.
    """
    r = _redis()
    if r is None:
        return 1.0
    try:
        raw = r.get(_ratio_key(trip_id))
        return float(raw) if raw else 1.0
    except Exception:  # noqa: BLE001
        return 1.0


@router.post(
    "/trips/start",
    response_model=TripOut,
    status_code=status.HTTP_201_CREATED,
    tags=["trips"],
)
def start_trip(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Tracking begins here and nowhere else.

    Consent is this tap, not a checkbox at install time.
    """
    today = Date.today()

    existing = db.execute(
        select(Trip).where(Trip.collector_user_id == user.id, Trip.date == today)
    ).scalar_one_or_none()
    if existing is not None and existing.ended_at is None:
        # Re-tapping "On my way" resumes rather than erroring — the collector
        # may have force-closed the app mid-journey.
        return TripOut.model_validate(existing)

    requests = db.execute(
        select(PickupRequest).where(
            PickupRequest.collector_id == user.id,
            PickupRequest.date == today,
            PickupRequest.status.in_(
                [PickupStatus.SCHEDULED, PickupStatus.LAPSED]
            ),
        )
    ).scalars().all()

    if not requests:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "You have no pickups scheduled today",
        )

    trip = existing or Trip(
        id=uuid.uuid4(),
        collector_user_id=user.id,
        date=today,
        started_at=utcnow(),
    )
    if existing is None:
        db.add(trip)
        db.flush()

    # A LAPSED request re-enters as EN_ROUTE the moment the collector sets off.
    # That is the whole reason no punitive "back of the queue" rule is needed.
    for r in requests:
        r.trip_id = trip.id
        r.status = PickupStatus.EN_ROUTE

    db.commit()
    db.refresh(trip)
    return TripOut.model_validate(trip)


def _measure_road_ratio(
    trip_id: uuid.UUID, lat: float, lng: float, school_lat: float, school_lng: float
) -> None:
    """
    Measure road-vs-straight-line once and cache it for the trip.

    Runs in a BackgroundTask, so nothing is waiting on TomTom - not even the
    ping that triggered it. Best effort throughout: a failure costs a little
    accuracy for one trip and nothing else.
    """
    ratio = road_ratio(
        from_lat=lat, from_lng=lng, to_lat=school_lat, to_lng=school_lng
    )
    r = _redis()
    if r is None:
        return
    try:
        r.setex(_ratio_key(trip_id), settings.trip_max_minutes * 60, f"{ratio:.4f}")
    except Exception:  # noqa: BLE001
        pass


@router.post("/trips/{trip_id}/location", tags=["trips"])
def push_location(
    trip_id: uuid.UUID,
    ping: LocationPing,
    background: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    One position report, roughly every 15 seconds while the app is open.

    Returns the recomputed ETA so the app can show it without a second call —
    on a phone at the gate, one round trip is meaningfully better than two.
    """
    trip = db.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such trip")
    if trip.collector_user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your trip")
    if trip.ended_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Trip has ended")

    # Hard stop, enforced server-side so a forgotten app cannot stream forever.
    if utcnow() - trip.started_at > timedelta(minutes=settings.trip_max_minutes):
        trip.ended_at = utcnow()
        db.commit()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Trip auto-ended after {settings.trip_max_minutes} minutes",
        )

    school = db.get(School, user.school_id)
    if school is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such school")

    now = time_mod.time()
    fixes: list[Fix] = []

    r = _redis()
    if r is not None:
        try:
            key = _fix_key(trip_id)
            r.rpush(key, json.dumps({"lat": ping.lat, "lng": ping.lng, "t": now}))
            r.ltrim(key, -MAX_FIXES, -1)
            r.expire(key, FIX_TTL_SECONDS)
            fixes = [
                Fix(lat=d["lat"], lng=d["lng"], at_epoch=d["t"])
                for d in (json.loads(x) for x in r.lrange(key, 0, -1))
            ]
        except Exception:  # noqa: BLE001
            fixes = []

    if not fixes:
        fixes = [Fix(lat=ping.lat, lng=ping.lng, at_epoch=now)]

    ratio = _read_ratio(trip.id)

    # First ping of this trip: nothing has measured the road yet. Queue the
    # lookup behind the response so this request never waits on TomTom. This
    # ping uses 1.0 - exactly what the system did before - and every ping after
    # it uses a real road distance.
    if ratio == 1.0:
        background.add_task(
            _measure_road_ratio, trip.id, ping.lat, ping.lng, school.lat, school.lng
        )

    distance_m, eta, inside = estimate(
        school_lat=school.lat,
        school_lng=school.lng,
        fixes=fixes,
        geofence_radius_m=school.geofence_radius_m,
        road_ratio=ratio,
    )

    trip.last_lat = ping.lat
    trip.last_lng = ping.lng
    trip.eta_seconds = eta

    # Recorded once, on first entry. This is the only part of the location
    # stream that survives past 24 hours.
    if inside and trip.entered_geofence_at is None:
        trip.entered_geofence_at = utcnow()

    linked = db.execute(
        select(PickupRequest).where(PickupRequest.trip_id == trip.id)
    ).scalars().all()

    # NEARBY is derived from ETA, not from the ring — see services/eta.py.
    new_status = (
        PickupStatus.NEARBY
        if eta <= settings.announce_eta_seconds
        else PickupStatus.EN_ROUTE
    )
    for req in linked:
        # Never walk back a child already staged or handed over.
        if req.status in (PickupStatus.EN_ROUTE, PickupStatus.NEARBY):
            req.status = new_status

    db.commit()

    announced_classes: list[str] = []
    if should_announce(eta, settings.announce_eta_seconds):
        announced_classes = _announce_arrival(db, trip=trip, user=user, eta=eta)

    broadcast.queue_changed(school_id=user.school_id, reason="location")

    return {
        "eta_seconds": eta,
        "distance_m": round(distance_m),
        "inside_geofence": inside,
        "status": new_status.value,
        "announced_to": announced_classes,
    }


def _announce_arrival(
    db: Session, *, trip: Trip, user: User, eta: int
) -> list[str]:
    """
    Speak in every classroom holding a child on this trip.

    Two things this must get right:

    ONE announcement per class per trip, not one per child. A van of six across
    three rooms is three announcements, never six — and it must not repeat on
    the next location ping fifteen seconds later. The uniqueness constraint on
    (class_id, trip_id) is what enforces that, so a race between two workers
    cannot double-announce either.

    Batched by class, so a room hears "Ali and Sara" once rather than twice.
    """
    rows = db.execute(
        select(PickupRequest, Student, SchoolClass)
        .join(Student, Student.id == PickupRequest.student_id)
        .join(SchoolClass, SchoolClass.id == Student.class_id)
        .where(
            PickupRequest.trip_id == trip.id,
            PickupRequest.status.in_([PickupStatus.EN_ROUTE, PickupStatus.NEARBY]),
        )
    ).all()

    by_class: dict[uuid.UUID, list[dict]] = {}
    for _req, student, cls in rows:
        by_class.setdefault(cls.id, []).append(
            {"student_id": str(student.id), "student_name": student.name}
        )

    spoken: list[str] = []
    for class_id, students in by_class.items():
        already = db.execute(
            select(SpokenAnnouncement).where(
                SpokenAnnouncement.class_id == class_id,
                SpokenAnnouncement.trip_id == trip.id,
            )
        ).scalar_one_or_none()
        if already is not None:
            continue

        db.add(
            SpokenAnnouncement(
                id=uuid.uuid4(),
                class_id=class_id,
                trip_id=trip.id,
                student_ids=[s["student_id"] for s in students],
                eta_seconds=eta,
                spoken_at=utcnow(),
                played_ok=False,
                created_at=utcnow(),
            )
        )
        try:
            db.commit()
        except Exception:  # noqa: BLE001
            # Another worker won the race on (class_id, trip_id). That is the
            # constraint doing its job, not an error.
            db.rollback()
            continue

        broadcast.announce(
            class_id=class_id,
            trip_id=trip.id,
            collector_name=user.name,
            students=students,
            eta_seconds=eta,
        )
        # The parent hears about it on her phone at the same moment the room
        # hears it aloud. Guarded by the same (class_id, trip_id) row, so this
        # cannot repeat on the next ping either.
        notify.notify_arrival(
            db,
            student_ids=[uuid.UUID(s["student_id"]) for s in students],
            collector=user,
            trip_id=trip.id,
        )
        spoken.append(str(class_id))

    return spoken


@router.post("/trips/{trip_id}/end", status_code=status.HTTP_204_NO_CONTENT, tags=["trips"])
def end_trip(
    trip_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ends tracking and discards the raw fixes immediately."""
    trip = db.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such trip")
    if trip.collector_user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your trip")

    if trip.ended_at is None:
        trip.ended_at = utcnow()
        db.commit()

    r = _redis()
    if r is not None:
        try:
            r.delete(_fix_key(trip_id))
        except Exception:  # noqa: BLE001
            pass  # the TTL will collect it

    return None
