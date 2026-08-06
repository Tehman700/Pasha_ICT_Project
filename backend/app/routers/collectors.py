"""
Collectors: per-child authorizations, and everything scoped to the signed-in
collector.

A collector is anyone who physically shows up — a parent, a relative, or a
driver. The distinction that matters is not their role but whether they hold a
live grant for a specific child.
"""

from __future__ import annotations

import uuid
from datetime import date as Date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import (
    AuthorizationKind,
    Guardianship,
    PickupAuthorization,
    PickupRequest,
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
from app.services.authorization import authorized_collectors, may_delegate

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


@router.get("/me/trip", tags=["me"])
def my_trip(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = db.execute(
        select(Trip).where(
            Trip.collector_user_id == user.id, Trip.date == Date.today()
        )
    ).scalar_one_or_none()
    return TripOut.model_validate(trip) if trip else None
