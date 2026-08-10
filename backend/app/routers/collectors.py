"""
Collectors: per-child authorizations, and everything scoped to the signed-in
collector.

A collector is anyone who physically shows up — a parent, a relative, or a
driver. The distinction that matters is not their role but whether they hold a
live grant for a specific child.
"""

from __future__ import annotations

import uuid
from datetime import date as Date, time as Time

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import (
    AuthorizationKind,
    Guardianship,
    PickupAuthorization,
    PickupRequest,
    PickupStatus,
    RequestSource,
    Schedule,
    Student,
    Trip,
    User,
)
from app.schemas import (
    AuthorizationOut,
    CreateAuthorizationRequest,
    PickupRequestOut,
    ScheduleOut,
    StudentOut,
    TripOut,
)
from app.services.authorization import (
    authorized_collectors,
    may_collect,
    may_delegate,
    may_view_student,
)

router = APIRouter()


def _my_student_ids(db: Session, user_id: uuid.UUID) -> list[uuid.UUID]:
    return list(
        db.execute(
            select(Guardianship.student_id).where(Guardianship.user_id == user_id)
        ).scalars().all()
    )


# ── authorizations ─────────────────────────────────────────────────────


@router.get(
    "/students/{student_id}/authorizations",
    response_model=list[AuthorizationOut],
    tags=["collectors"],
)
def list_authorizations(
    student_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not may_view_student(db, viewer=user, student_id=student_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted for this child")
    rows = db.execute(
        select(PickupAuthorization).where(PickupAuthorization.student_id == student_id)
    ).scalars().all()
    return [AuthorizationOut.model_validate(r) for r in rows]


@router.post(
    "/students/{student_id}/authorizations",
    response_model=AuthorizationOut,
    status_code=status.HTTP_201_CREATED,
    tags=["collectors"],
)
def grant_authorization(
    student_id: uuid.UUID,
    body: CreateAuthorizationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Grant someone access to one child.

    Requires `can_delegate` on a guardianship for this child. A collector who
    was themselves granted access cannot pass it on — otherwise a driver could
    authorize another driver and the parent would never know.
    """
    if not may_delegate(db, granter_id=user.id, student_id=student_id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "You may not grant access to this child",
        )

    collector = db.get(User, body.collector_user_id)
    if collector is None or collector.school_id != user.school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such collector")

    auth = PickupAuthorization(
        id=uuid.uuid4(),
        student_id=student_id,
        collector_user_id=body.collector_user_id,
        granted_by_user_id=user.id,
        kind=body.kind,
        valid_from=body.valid_from or Date.today(),
        valid_until=body.valid_until,
    )
    db.add(auth)
    db.commit()
    db.refresh(auth)
    return AuthorizationOut.model_validate(auth)


@router.delete(
    "/authorizations/{auth_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["collectors"],
)
def revoke_authorization(
    auth_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Revoke.

    Sets `revoked_at` rather than deleting — the audit log must still be able
    to explain a handover that happened while the grant was live.

    Only the granting guardian may revoke, which is what makes revocation
    per-family: removing a driver here leaves every other family's grant to
    that same driver untouched.
    """
    auth = db.get(PickupAuthorization, auth_id)
    if auth is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such authorization")
    if not may_delegate(db, granter_id=user.id, student_id=auth.student_id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "You may not change access for this child"
        )
    if auth.revoked_at is None:
        from app.db import utcnow

        auth.revoked_at = utcnow()
        db.commit()
    return None


@router.get("/students/{student_id}/collectors", tags=["collectors"])
def student_collectors(
    student_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Everyone who may collect this child today.

    Backs the guard's manual-fallback screen: the guard picks from this list
    and nothing else, so a manual handover is constrained to exactly the same
    set as a QR scan.
    """
    if not may_view_student(db, viewer=user, student_id=student_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted for this child")
    return [
        {"user": {"id": str(u.id), "name": u.name, "name_ur": u.name_ur,
                  "role": u.role.value, "phone": u.phone, "photo_url": u.photo_url},
         "basis": basis}
        for u, basis in authorized_collectors(db, student_id=student_id)
    ]


# ── me ─────────────────────────────────────────────────────────────────


@router.get("/me/children", response_model=list[StudentOut], tags=["me"])
def my_children(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The caller's own children. Empty for a driver, who is nobody's guardian."""
    ids = _my_student_ids(db, user.id)
    if not ids:
        return []
    rows = db.execute(select(Student).where(Student.id.in_(ids))).scalars().all()
    return [StudentOut.model_validate(r) for r in rows]


@router.get("/me/schedules", response_model=list[ScheduleOut], tags=["me"])
def my_schedules(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ids = _my_student_ids(db, user.id)
    if not ids:
        # A driver has no children of their own, but does have scheduled days.
        rows = db.execute(
            select(Schedule).where(Schedule.collector_id == user.id)
        ).scalars().all()
        return [ScheduleOut.model_validate(r) for r in rows]
    rows = db.execute(
        select(Schedule).where(Schedule.student_id.in_(ids)).order_by(Schedule.weekday)
    ).scalars().all()
    return [ScheduleOut.model_validate(r) for r in rows]


@router.get("/me/collectors", response_model=list[AuthorizationOut], tags=["me"])
def my_collectors(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """People this parent has authorized — only grants they themselves made."""
    rows = db.execute(
        select(PickupAuthorization).where(
            PickupAuthorization.granted_by_user_id == user.id
        )
    ).scalars().all()
    return [AuthorizationOut.model_validate(r) for r in rows]


@router.get("/me/manifest", response_model=list[PickupRequestOut], tags=["me"])
def my_manifest(
    date: Date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Today's pickups for the signed-in collector.

    For a parent that is their own children. For a driver it spans many
    families and often several classes — same endpoint, same shape, and the
    parent app renders both without branching.
    """
    rows = db.execute(
        select(PickupRequest).where(
            PickupRequest.collector_id == user.id,
            PickupRequest.date == (date or Date.today()),
        )
    ).scalars().all()
    return [PickupRequestOut.model_validate(r) for r in rows]


@router.get("/me/children-pickups", response_model=list[PickupRequestOut], tags=["me"])
def my_children_pickups(
    date: Date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Today's pickups for the caller's own children, whoever is collecting them.

    Distinct from `/me/manifest`, which answers "what am I collecting" — the
    right question for a driver and the wrong one for a parent. A mother whose
    children go home in a van is the collector for nobody, so the manifest is
    empty for her, and a home screen built on it showed her nothing at all on
    a perfectly normal day.
    """
    rows = db.execute(
        select(PickupRequest)
        .join(Guardianship, Guardianship.student_id == PickupRequest.student_id)
        .where(
            Guardianship.user_id == user.id,
            PickupRequest.date == (date or Date.today()),
        )
    ).scalars().all()
    return [PickupRequestOut.model_validate(r) for r in rows]


@router.get("/me/trip", tags=["me"])
def my_trip(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = db.execute(
        select(Trip).where(
            Trip.collector_user_id == user.id, Trip.date == Date.today()
        )
    ).scalar_one_or_none()
    return TripOut.model_validate(trip) if trip else None


@router.get("/me/queue-entry", tags=["me"])
def my_queue_entry(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    This collector's own place in the queue.

    Derived from the class-wide queue rather than computed separately, so a
    parent can never see a different position than the teacher does.
    """
    from app.routers.operations import get_queue

    trip = db.execute(
        select(Trip).where(
            Trip.collector_user_id == user.id, Trip.date == Date.today()
        )
    ).scalar_one_or_none()
    if trip is None:
        return None

    for entry in get_queue(class_id=None, user=user, db=db):
        if entry["trip_id"] == str(trip.id):
            return entry
    return None


class ExceptionRequest(BaseModel):
    scheduled_time: str | None = None
    collector_id: uuid.UUID | None = None
    cancelled: bool = False


@router.post("/pickup-requests/{request_id}/exception", tags=["pickup-requests"])
def set_exception(
    request_id: uuid.UUID,
    body: ExceptionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Change today only. The weekly schedule is untouched.

    Two rules, both about not stranding a child:

    It NEVER persists silently. A parent who taps once and forgets must not
    find the van stopped coming for a week.

    It changes who is EXPECTED, never who is ALLOWED. If her car breaks down
    and she cannot undo it, any authorized collector can still take the child.
    """
    req = db.get(PickupRequest, request_id)
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such pickup request")
    if not may_delegate(db, granter_id=user.id, student_id=req.student_id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "You may not change this child's pickup"
        )
    if req.status == PickupStatus.HANDED_OVER:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already handed over")

    if body.cancelled:
        req.status = PickupStatus.CANCELLED
    if body.scheduled_time:
        try:
            h, m = (int(x) for x in body.scheduled_time.split(":")[:2])
            req.scheduled_time = Time(h, m)
        except ValueError:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, "scheduled_time must be HH:MM"
            ) from None

    if body.collector_id is not None:
        # Only someone already authorized for this child. An exception must not
        # become a back door for granting access.
        verdict = may_collect(
            db, collector_id=body.collector_id, student_id=req.student_id
        )
        if not verdict.allowed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "That person is not authorized to collect this child",
            )
        req.collector_id = body.collector_id

    req.source = RequestSource.exception
    db.commit()
    db.refresh(req)
    return PickupRequestOut.model_validate(req)


@router.get("/schedules", response_model=list[ScheduleOut], tags=["schedules"])
def list_schedules(
    student_id: uuid.UUID | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if student_id is not None:
        if not may_view_student(db, viewer=user, student_id=student_id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted for this child")
        rows = db.execute(
            select(Schedule).where(Schedule.student_id == student_id)
        ).scalars().all()
        return [ScheduleOut.model_validate(r) for r in rows]
    return my_schedules(user=user, db=db)


@router.post(
    "/schedules",
    response_model=ScheduleOut,
    status_code=status.HTTP_201_CREATED,
    tags=["schedules"],
)
def upsert_schedule(
    body: ScheduleOut,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Set the recurring default for one weekday.

    Upsert rather than insert: a parent editing Tuesday twice should end up
    with one Tuesday, and the unique constraint on (student, weekday) would
    otherwise turn a second edit into a 500.
    """
    if not may_delegate(db, granter_id=user.id, student_id=body.student_id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "You may not set this child's schedule"
        )
    verdict = may_collect(
        db, collector_id=body.collector_id, student_id=body.student_id
    )
    if not verdict.allowed:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "That person is not authorized to collect this child",
        )

    existing = db.execute(
        select(Schedule).where(
            Schedule.student_id == body.student_id, Schedule.weekday == body.weekday
        )
    ).scalar_one_or_none()

    if existing is not None:
        existing.collector_id = body.collector_id
        existing.pickup_time = body.pickup_time
        db.commit()
        db.refresh(existing)
        return ScheduleOut.model_validate(existing)

    row = Schedule(
        id=uuid.uuid4(),
        student_id=body.student_id,
        collector_id=body.collector_id,
        weekday=body.weekday,
        pickup_time=body.pickup_time,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ScheduleOut.model_validate(row)
