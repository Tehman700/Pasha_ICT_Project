"""
One-off passes — the only QR issued to someone with no account.

"My brother is collecting Ahmed and Zara today." He has no phone in the system,
no geofence, no prior record. He is the one person who needs to *carry*
something.

**One pass covers as many of the parent's children as she names.** A relative
sent to fetch three siblings is one errand, and issuing three codes for it would
mean three scans at the gate, three chances to show the wrong one, and three
rows to revoke if plans change. The pass carries a list of children and the
guard sees all of them on one screen.

**No photo of the bearer.** A parent cannot reliably produce a photo of her
brother at the moment she needs to send him — and a field she cannot fill turns
into a screen she abandons, which means she rings the school office instead and
the system has bought nothing. The name and phone she types are what the guard
checks against, the same two things he would ask for if the app did not exist.

What actually keeps a forwardable image safe is the burn and the expiry below,
not a photograph.

Two limits, both per-pass:

**Expiry.** The parent may set an exact moment — she knows her brother is coming
between 1 and 3, and we do not. Unset, it falls back to midnight tonight. A pass
never survives the day it was made whatever she picks.

**The burn.** First successful scan, and the code is dead. Keyed to the pass
itself, not to the children on it: a parent hedging between two relatives may
issue two passes for the same child, and burning by child would strand whichever
relative arrived second holding a code that had never been scanned.

The pass creates a real (login-less) user and one `one_time` authorization per
child rather than a parallel code path, so it flows through exactly the same
`may_collect` check, handover route and audit log as everyone else. A second
authorization branch is how a gap opens between what the QR path allows and what
the manual path allows.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import date as Date, datetime, time, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.phone import normalise as normalise_phone
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
    relation: str | None = None

    #: Additional children on the same pass. The child in the path is always
    #: included; these are the siblings. Every one is checked against
    #: `may_delegate` separately — naming a child she does not have rights over
    #: fails the whole request rather than silently dropping that child.
    also_student_ids: list[uuid.UUID] = Field(default_factory=list)

    #: When the code stops working. Unset means midnight tonight.
    #:
    #: The parent knows the collection window and we do not, so let her narrow
    #: it. Capped at midnight regardless: a pass still live tomorrow is a real
    #: risk and no legitimate case needs one.
    expires_at: datetime | None = None


def _end_of_day() -> datetime:
    """
    Midnight tonight, school time. A pass never survives the day it was made.

    Derived from the current time *in Karachi*, not `Date.today()`. The server
    runs UTC, so between 7pm and midnight local the UTC date is still yesterday
    — and a pass issued for an evening activity would have been born already
    expired.
    """
    tomorrow = utcnow().astimezone(TZ).date() + timedelta(days=1)
    return datetime.combine(tomorrow, time(0, 0), tzinfo=TZ)


def _resolve_expiry(requested: datetime | None) -> datetime:
    """
    The parent's chosen moment, bounded at both ends.

    Rejecting an out-of-range value would be the wrong call for a screen used
    once a term: a parent who fat-fingers tomorrow's date gets a pass that works
    today rather than a validation error she has to decode at the school gate.
    """
    cap = _end_of_day()
    if requested is None:
        return cap
    # A naive datetime from a client that dropped the offset is school time —
    # the alternative is reading it as UTC and expiring a 1pm pass at 8am.
    if requested.tzinfo is None:
        requested = requested.replace(tzinfo=TZ)
    if requested >= cap:
        return cap
    # Already-past expiry is a dead pass. Give the parent the default rather
    # than a code that is born expired.
    if requested <= utcnow():
        return cap
    return requested


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
    A parent issues a same-day pass to someone with no account.

    Covers one child or several — the path child plus any siblings in
    `also_student_ids`. Returns a signed token to send on WhatsApp. Single use,
    expires at the parent's chosen moment or midnight, whichever is sooner.
    """
    # Deduplicate: the path child appearing again in the list is a natural
    # client mistake and must not produce two authorizations for one child.
    student_ids: list[uuid.UUID] = [student_id]
    for sid in body.also_student_ids:
        if sid not in student_ids:
            student_ids.append(sid)

    # Every child, not just the first. Checking only the path child would let a
    # parent attach someone else's child to a pass for her own.
    for sid in student_ids:
        if not may_delegate(db, granter_id=user.id, student_id=sid):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "You may not issue a pass for one of these children",
            )

    students = [db.get(Student, sid) for sid in student_ids]
    school = db.get(School, user.school_id)
    if any(s is None for s in students) or school is None or not school.private_key_enc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such student or signing key")
    student = students[0]

    # `users.phone` is globally unique, so the same relative fetched twice in a
    # term must reuse his row rather than insert a second one. Without this the
    # second pass dies on a UniqueViolation — a 500 to a parent who did nothing
    # wrong, on the perfectly ordinary "my brother came again on Friday".
    existing = db.execute(
        select(User).where(User.phone == normalise_phone(body.phone))
    ).scalar_one_or_none()

    if existing is not None:
        # Reuse ONLY a login-less bearer from this same school. A phone number
        # matching a real account — a driver, a teacher, another parent — must
        # never be adopted: issuing a pass would otherwise silently mint an
        # authorization against a live identity the issuer does not control,
        # and `is_active=False` would then lock that person out of their own
        # account.
        if (
            existing.is_active
            or existing.school_id != user.school_id
            or existing.password_hash is None
        ):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "That phone number already belongs to a registered account. "
                "Add them as a collector instead of issuing a pass.",
            )
        bearer = existing
        # People do change how they write their own name between passes.
        bearer.name = body.name
    else:
        # A login-less account. `is_active=False` means these credentials can
        # never authenticate — the pass is the credential, not a password.
        bearer = User(
            id=uuid.uuid4(),
            school_id=user.school_id,
            role=Role.parent,
            name=body.name,
            phone=body.phone,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            locale=user.locale,
            is_active=False,
        )
        db.add(bearer)
    db.flush()

    # Server date, matching `may_collect` — both sides must read the same clock
    # or a pass valid by one check is expired by the other. `expires_at` is the
    # precise limit and is Karachi-derived; this is only the coarse day window.
    today = Date.today()
    expires = _resolve_expiry(body.expires_at)

    # One authorization per child, sharing one bearer and one expiry. They are
    # ordinary `one_time` rows, so `may_collect` and the handover route need no
    # knowledge that a pass exists.
    auths = [
        PickupAuthorization(
            id=uuid.uuid4(),
            student_id=sid,
            collector_user_id=bearer.id,
            granted_by_user_id=user.id,
            kind=AuthorizationKind.one_time,
            valid_from=today,
            valid_until=today,
            expires_at=expires,
        )
        for sid in student_ids
    ]
    for auth in auths:
        db.add(auth)

    # `pid` names the first row and `aid` carries the rest, so a scan can burn
    # every child on the pass in one step. Sending only `pid` would leave the
    # siblings' rows live after the code had been redeemed.
    token = jwt.encode(
        {
            "typ": "pass",
            "pid": str(auths[0].id),
            "aid": [str(a.id) for a in auths],
            "sid": [str(sid) for sid in student_ids],
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
            entity_id=auths[0].id,
            payload={
                "students": [s.name for s in students],
                "authorization_ids": [str(a.id) for a in auths],
                "bearer": body.name,
                "phone": body.phone,
                "relation": body.relation,
                "expires_at": expires.isoformat(),
                # A parent-set expiry is a deliberate act and worth being able
                # to reconstruct later.
                "expiry_set_by_parent": body.expires_at is not None,
            },
            # Not flagged. Every pass is now the same shape, so flagging them
            # all would flag nothing — an admin review list where every row is
            # marked is one nobody reads.
            created_at=utcnow(),
        )
    )
    db.commit()

    return {
        "pass_id": str(auths[0].id),
        "token": token,
        "expires_at": expires.isoformat(),
        # Whether the cap applied. A parent who asked for tomorrow should be
        # told plainly that her pass ends at midnight, not left to discover it.
        "expiry_capped": body.expires_at is not None and expires == _end_of_day(),
        # Singular kept alongside the list: existing clients read `student`,
        # and removing it would break them for no gain.
        "student": {"id": str(student.id), "name": student.name},
        "students": [{"id": str(s.id), "name": s.name} for s in students],
        "bearer": {
            "name": body.name,
            "phone": body.phone,
            "relation": body.relation,
        },
    }


@router.post("/passes/verify", tags=["qr"])
def verify_pass(
    body: dict,
    guard: User = Depends(require_guard),
    db: Session = Depends(get_db),
):
    """
    Guard scans a one-off pass. **Redeems it** — this call burns the code.

    On a valid scan the speaker fires automatically and the guard presses
    nothing — the children start walking while he checks the photo. That
    ordering is the whole design: automate the announcement, never automate
    the release.

    The burn lands here rather than on handover because the scan is the only
    moment we are certain the code was presented. A guard who scans and then
    refuses on the photo has still spent the pass, which is correct: that code
    is now known to be in the wrong hands.
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

    # `aid` carries every child's row; `pid` alone is the single-child shape
    # issued before multi-child passes existed, and those codes must keep
    # working for the rest of the day they were made.
    try:
        auth_ids = [uuid.UUID(a) for a in payload.get("aid") or [payload["pid"]]]
    except (KeyError, ValueError, TypeError):
        return {"valid": False, "code": "malformed", "message": "This is not a pass code."}

    auths = [db.get(PickupAuthorization, aid) for aid in auth_ids]
    auths = [a for a in auths if a is not None]
    if not auths:
        return {"valid": False, "code": "revoked", "message": "This pass has been cancelled."}

    # The signature already proves this school minted it, but the ids inside a
    # validly-signed token are still attacker-influenced. Confirm every child
    # actually belongs to the scanning guard's school before burning anything.
    if any(
        (s := db.get(Student, a.student_id)) is None or s.school_id != guard.school_id
        for a in auths
    ):
        return {"valid": False, "code": "malformed", "message": "This is not a pass code."}

    # Revoking any child on the pass kills the whole code. A parent who
    # withdraws one sibling did not mean "still fetch the other" — and the
    # guard has one QR in front of him, not one per child.
    if any(a.revoked_at is not None for a in auths):
        return {"valid": False, "code": "revoked", "message": "This pass has been cancelled."}

    # Expiry, per pass. The signature carries the same moment in `exp` and jwt
    # already enforced it, but a parent shortening a live pass writes only to
    # the database — the issued token cannot be recalled from WhatsApp.
    now = utcnow()
    if any(a.expires_at is not None and a.expires_at <= now for a in auths):
        return {"valid": False, "code": "expired", "message": "This pass has expired."}

    # ── The burn ───────────────────────────────────────────────────────
    #
    # One UPDATE guarded by `used_at IS NULL`, so two guards scanning the same
    # forwarded code at the same instant cannot both be told yes: the database
    # decides, not the order two requests happen to arrive in.
    burned = db.execute(
        update(PickupAuthorization)
        .where(
            PickupAuthorization.id.in_([a.id for a in auths]),
            PickupAuthorization.used_at.is_(None),
        )
        .values(used_at=now)
    ).rowcount

    if not burned:
        return {
            "valid": False,
            "code": "already_used",
            "message": "This pass has already been used.",
        }
    db.commit()

    auth = auths[0]
    bearer = db.get(User, auth.collector_user_id)
    students = [db.get(Student, a.student_id) for a in auths]
    student = students[0]

    # One pickup_request per child — the guard app posts a handover against
    # each, so a pass covering three siblings produces three handover rows and
    # three "handed over" notifications, exactly as three separate collections
    # would.
    from app.models import PickupRequest

    today = Date.today()
    requests = {
        r.student_id: r
        for r in db.execute(
            select(PickupRequest).where(
                PickupRequest.student_id.in_([a.student_id for a in auths]),
                PickupRequest.date == today,
            )
        ).scalars()
    }

    children = [
        {
            "id": str(s.id),
            "name": s.name,
            "photo_url": s.photo_url,
            "pickup_request_id": (
                str(requests[s.id].id) if s.id in requests else None
            ),
        }
        for s in students
        if s is not None
    ]

    return {
        "valid": True,
        "pass_id": str(auth.id),
        # Singular fields describe the first child and are kept so existing
        # clients keep working; `students` is the real answer.
        "pickup_request_id": children[0]["pickup_request_id"] if children else None,
        "student": {
            "id": str(student.id),
            "name": student.name,
            "photo_url": student.photo_url,
        }
        if student
        else None,
        "students": children,
        # No bearer photo by design — a parent cannot reliably produce one of
        # her brother at the moment she needs to send him. The name and phone
        # are what the guard checks, which is what he would ask for anyway.
        # The CHILDREN's photos above are the school's own records and stay:
        # they are how he knows who is walking out of the gate.
        "bearer": {
            "name": bearer.name,
            "phone": bearer.phone,
        }
        if bearer
        else None,
        "check": "Confirm the name and phone number before releasing.",
        "announce": True,
    }
