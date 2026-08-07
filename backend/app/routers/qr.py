"""QR token issuing and server-side verification."""

from __future__ import annotations

import uuid
from datetime import date as Date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, require_guard
from app.models import Handover, PickupRequest, School, Student, Trip, User
from app.services.authorization import may_collect
from app.services.qr_tokens import (
    ROTATE_SECONDS,
    TokenInvalid,
    mint_batch,
    verify,
)

router = APIRouter()

#: A trip can run 90 minutes, so a batch must cover that rather than a round
#: number of tokens. 20 tokens is only ~20 minutes — a collector waiting at the
#: gate would run out in exactly the offline case this exists for.
DEFAULT_BATCH = (90 * 60) // ROTATE_SECONDS  # 90


class BatchRequest(BaseModel):
    trip_id: uuid.UUID
    count: int = Field(default=DEFAULT_BATCH, ge=1, le=180)


@router.post("/qr-tokens/batch", tags=["qr"])
def issue_batch(
    body: BatchRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Pre-sign a batch of tokens when a trip starts.

    Fetched once, over whatever signal the collector has at home. After that
    the phone rotates through them locally, so the gate works with none.
    """
    trip = db.get(Trip, body.trip_id)
    if trip is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such trip")
    if trip.collector_user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your trip")

    school = db.get(School, user.school_id)
    if school is None or not school.private_key_enc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "This school has no signing key configured",
        )

    student_ids = list(
        db.execute(
            select(PickupRequest.student_id).where(PickupRequest.trip_id == trip.id)
        ).scalars().all()
    )
    if not student_ids:
        raise HTTPException(status.HTTP_409_CONFLICT, "No children on this trip")

    return mint_batch(
        private_key_pem=school.private_key_enc,
        trip_id=trip.id,
        collector_id=user.id,
        school_id=school.id,
        student_ids=student_ids,
        count=body.count,
    )


class ScanRequest(BaseModel):
    token: str
    device_id: str


@router.post("/qr-tokens/verify", tags=["qr"])
def verify_scan(
    body: ScanRequest,
    guard: User = Depends(require_guard),
    db: Session = Depends(get_db),
):
    """
    Server-side verification, for when the guard DOES have signal.

    The guard app performs the same check offline against the cached public
    key — this endpoint exists so the two can be compared, and so a scan can be
    resolved to names and photos the device may not have cached.

    A green verdict is NOT the handover. The guard still sees both photos and
    confirms with his own eyes; software proposes, a person decides.
    """
    school = db.get(School, guard.school_id)
    if school is None or not school.public_key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "No verification key")

    # jtis already redeemed today. This is what stops a forwarded screenshot
    # being used twice while still inside its 90-second window.
    used = set(
        db.execute(
            select(Handover.qr_jti)
            .join(PickupRequest, PickupRequest.id == Handover.pickup_request_id)
            .where(PickupRequest.date == Date.today(), Handover.qr_jti.is_not(None))
        ).scalars().all()
    )

    try:
        payload = verify(body.token, public_key_pem=school.public_key, used_jtis=used)
    except TokenInvalid as bad:
        return {"valid": False, "code": bad.code, "message": bad.message}

    if payload.get("sch") != str(guard.school_id):
        return {
            "valid": False,
            "code": "wrong_school",
            "message": "This code was issued by a different school.",
        }

    collector = db.get(User, uuid.UUID(payload["gid"]))
    requests = db.execute(
        select(PickupRequest, Student)
        .join(Student, Student.id == PickupRequest.student_id)
        .where(
            PickupRequest.trip_id == uuid.UUID(payload["rq"]),
            PickupRequest.date == Date.today(),
        )
    ).all()

    children = []
    for req, student in requests:
        # Signature valid is not the same as authorized. A token minted before
        # a parent revoked access is still cryptographically perfect.
        verdict = may_collect(
            db, collector_id=req.collector_id, student_id=student.id, on_date=req.date
        )
        children.append(
            {
                "pickup_request_id": str(req.id),
                "student_id": str(student.id),
                "student_name": student.name,
                "student_photo_url": student.photo_url,
                "status": req.status.value,
                "authorized": verdict.allowed,
                "reason": None if verdict.allowed else verdict.reason,
            }
        )

    return {
        "valid": True,
        "jti": payload["jti"],
        "collector": (
            {
                "id": str(collector.id),
                "name": collector.name,
                "name_ur": collector.name_ur,
                "photo_url": collector.photo_url or collector.selfie_url,
                "role": collector.role.value,
            }
            if collector
            else None
        ),
        "children": children,
        "confirm_visually": "Check both photos before releasing the child.",
    }
