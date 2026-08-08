"""
One-off passes — the only QR issued to someone with no account.

"My brother is collecting Ahmed today." He has no phone in the system, no
geofence, no prior record. He is the one person who needs to *carry* something.

The photo is mandatory, and this is the part worth defending. A QR sent over
WhatsApp is a forwardable image: screenshot it, forward it, leave the phone
unlocked in a shop, and whoever holds that picture can collect a child. With
the photo, the guard is looking at a picture of the man in front of him while
the child walks across the yard. One field, no extra taps, and the child stops
walking out on a forwarded screenshot.

The pass creates a real (login-less) user and a `one_time` authorization rather
than a parallel code path, so it flows through exactly the same `may_collect`
check, handover route and audit log as everyone else. A second authorization
branch is how a gap opens between what the QR path allows and what the manual
path allows.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import date as Date, datetime, time, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db, utcnow
from app.deps import get_current_user, require_guard
from app.models import (
    AuditLog,
    AuthorizationKind,
    PickupAuthorization,
    Role,
    School,
    Student,
    User,
)
from app.security import hash_password
from app.services.authorization import may_delegate

router = APIRouter()

TZ = timezone(timedelta(hours=5))  # Asia/Karachi


class IssuePass(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    phone: str = Field(min_length=5, max_length=32)
    #: Required. See the module docstring — this is what stops a forwarded
    #: screenshot from collecting a child.
    photo_url: str | None = None
    relation: str | None = None


def _expires_at() -> datetime:
    """Midnight tonight, school time. A pass never survives the day it was made."""
    tomorrow = Date.today() + timedelta(days=1)
    return datetime.combine(tomorrow, time(0, 0), tzinfo=TZ)


@router.post(
    "/students/{student_id}/temporary-pass",
    status_code=status.HTTP_201_CREATED,
    tags=["collectors"],
)
def issue_pass(
    student_id: uuid.UUID,
    body: IssuePass,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    A parent issues a one-day pass to someone with no account.

    Returns a signed token to send on WhatsApp. Single use, expires at
    midnight, and refused the moment the child has been collected.
    """
    if not may_delegate(db, granter_id=user.id, student_id=student_id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "You may not issue a pass for this child"
        )

    student = db.get(Student, student_id)
    school = db.get(School, user.school_id)
    if student is None or school is None or not school.private_key_enc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such student or signing key")

    # A login-less account. `is_active=False` means these credentials can never
    # authenticate — the pass is the credential, not a password.
    bearer = User(
        id=uuid.uuid4(),
        school_id=user.school_id,
        role=Role.parent,
        name=body.name,
        phone=body.phone,
        password_hash=hash_password(secrets.token_urlsafe(32)),
        locale=user.locale,
        photo_url=body.photo_url,
        selfie_url=body.photo_url,
        is_active=False,
    )
    db.add(bearer)
    db.flush()

    today = Date.today()
    auth = PickupAuthorization(
        id=uuid.uuid4(),
        student_id=student_id,
        collector_user_id=bearer.id,
        granted_by_user_id=user.id,
        kind=AuthorizationKind.one_time,
        valid_from=today,
        valid_until=today,
    )
    db.add(auth)

    expires = _expires_at()
    token = jwt.encode(
        {
            "typ": "pass",
            "pid": str(auth.id),
            "sid": [str(student_id)],
            "gid": str(bearer.id),
            "sch": str(school.id),
            "iat": int(utcnow().timestamp()),
            "exp": int(expires.timestamp()),
            "jti": uuid.uuid4().hex,
        },
        school.private_key_enc,
        algorithm="ES256",
    )

    db.add(
        AuditLog(
            id=uuid.uuid4(),
            school_id=user.school_id,
            actor_user_id=user.id,
            action="pass.issued",
            entity_type="pickup_authorization",
            entity_id=auth.id,
            payload={
                "student": student.name,
                "bearer": body.name,
                "phone": body.phone,
                "has_photo": bool(body.photo_url),
            },
            # A pass issued without a photo is the weak case, so surface it.
            flagged=not body.photo_url,
            created_at=utcnow(),
        )
    )
    db.commit()

    return {
        "pass_id": str(auth.id),
        "token": token,
        "expires_at": expires.isoformat(),
        "student": {"id": str(student.id), "name": student.name},
        "bearer": {
            "name": body.name,
            "phone": body.phone,
            "photo_url": body.photo_url,
        },
        "warning": (
            None
            if body.photo_url
            else "No photo. Anyone who receives this code can collect your child — "
            "the guard will have nothing to check them against."
        ),
    }


@router.post("/passes/verify", tags=["qr"])
def verify_pass(
    body: dict,
    guard: User = Depends(require_guard),
    db: Session = Depends(get_db),
):
    """
    Guard scans a one-off pass.

    On a valid scan the speaker fires automatically and the guard presses
    nothing — the child starts walking while he checks the photo. That
    ordering is the whole design: automate the announcement, never automate
    the release.
    """
    token = (body or {}).get("token", "")
    school = db.get(School, guard.school_id)
    if school is None or not school.public_key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "No verification key")

    try:
        payload = jwt.decode(
            token, school.public_key, algorithms=["ES256"], leeway=60
        )
    except jwt.ExpiredSignatureError:
        return {"valid": False, "code": "expired", "message": "This pass has expired."}
    except jwt.PyJWTError:
        return {"valid": False, "code": "malformed", "message": "This is not a valid pass."}

    if payload.get("typ") != "pass":
        return {"valid": False, "code": "malformed", "message": "This is not a pass code."}

    auth = db.get(PickupAuthorization, uuid.UUID(payload["pid"]))
    if auth is None or auth.revoked_at is not None:
        return {"valid": False, "code": "revoked", "message": "This pass has been cancelled."}

    from app.models import Handover, PickupRequest

    req = db.execute(
        select(PickupRequest).where(
            PickupRequest.student_id == auth.student_id,
            PickupRequest.date == Date.today(),
        )
    ).scalar_one_or_none()

    if req is not None:
        used = db.execute(
            select(Handover).where(Handover.pickup_request_id == req.id)
        ).scalar_one_or_none()
        if used is not None:
            # Burns on use. A forwarded screenshot arriving second gets nothing.
            return {
                "valid": False,
                "code": "already_used",
                "message": "This child has already been collected today.",
            }

    bearer = db.get(User, auth.collector_user_id)
    student = db.get(Student, auth.student_id)

    return {
        "valid": True,
        "pass_id": str(auth.id),
        "pickup_request_id": str(req.id) if req else None,
        "student": {
            "id": str(student.id),
            "name": student.name,
            "photo_url": student.photo_url,
        }
        if student
        else None,
        "bearer": {
            "name": bearer.name,
            "phone": bearer.phone,
            "photo_url": bearer.photo_url,
        }
        if bearer
        else None,
        # Degraded, not blind. The guard is told exactly what he has to do
        # instead of a photo, rather than being left to guess.
        "photo_warning": (
            None
            if bearer and bearer.photo_url
            else "No photo on this pass — verify the name and phone number before releasing."
        ),
        "announce": True,
    }
