"""
May this person collect this child today?

The single question every handover path asks. It is deliberately separate from
the role guards in `deps.py`: those answer "is this user a guard?", this answers
"is this specific collector allowed to take this specific child, right now?".
Conflating the two is how a guard ends up able to release any child to anyone.

Two independent grounds for a yes:
  1. a guardianship — this is the child's own parent
  2. a live pickup_authorization — a driver or relative the parent added

Manual fallback uses this too. Manual does not mean unchecked: it means the
QR could not be scanned, not that authorization is waived.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date as Date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    AuthorizationKind,
    Guardianship,
    PickupAuthorization,
    Role,
    Student,
    User,
)


@dataclass(frozen=True)
class AuthorizationResult:
    allowed: bool
    reason: str
    #: "guardian" or "authorization"; None when refused.
    basis: str | None = None
    authorization_id: uuid.UUID | None = None


def may_collect(
    db: Session,
    *,
    collector_id: uuid.UUID,
    student_id: uuid.UUID,
    on_date: Date | None = None,
) -> AuthorizationResult:
    """Authoritative check. Every handover must pass through this."""
    on_date = on_date or Date.today()

    student = db.get(Student, student_id)
    if student is None:
        return AuthorizationResult(False, "no_such_student")

    collector = db.get(User, collector_id)
    if collector is None or not collector.is_active:
        return AuthorizationResult(False, "no_such_collector")

    # Cross-school collection is never valid, whatever the grants say.
    if collector.school_id != student.school_id:
        return AuthorizationResult(False, "different_school")

    # 1. The child's own guardian.
    guardianship = db.execute(
        select(Guardianship).where(
            Guardianship.student_id == student_id,
            Guardianship.user_id == collector_id,
        )
    ).scalar_one_or_none()
    if guardianship is not None:
        return AuthorizationResult(True, "guardian", basis="guardian")

    # 2. A standing or one-time authorization granted by a guardian.
    rows = db.execute(
        select(PickupAuthorization).where(
            PickupAuthorization.student_id == student_id,
            PickupAuthorization.collector_user_id == collector_id,
        )
    ).scalars().all()

    for auth in rows:
        # Revocation is per-family. This driver may still hold live grants
        # from other families — that is intended, and is why the check is
        # per (student, collector) rather than per collector.
        if auth.revoked_at is not None:
            continue
        if auth.valid_from > on_date:
            continue
        if auth.valid_until is not None and auth.valid_until < on_date:
            continue
        return AuthorizationResult(
            True,
            "authorized",
            basis="authorization",
            authorization_id=auth.id,
        )

    if rows:
        # Distinguishing these matters at the gate: "their access was removed"
        # is a different conversation with a parent than "they were never
        # added".
        return AuthorizationResult(False, "authorization_revoked_or_expired")

    return AuthorizationResult(False, "not_authorized")


def may_delegate(
    db: Session, *, granter_id: uuid.UUID, student_id: uuid.UUID
) -> bool:
    """
    Can this user grant someone else access to this child?

    Requires a guardianship with `can_delegate`. A collector who was themselves
    granted access cannot pass it on — otherwise a driver could authorize
    another driver, and the parent would never know.
    """
    g = db.execute(
        select(Guardianship).where(
            Guardianship.student_id == student_id,
            Guardianship.user_id == granter_id,
        )
    ).scalar_one_or_none()
    return g is not None and g.can_delegate


def authorized_collectors(
    db: Session, *, student_id: uuid.UUID, on_date: Date | None = None
) -> list[tuple[User, str]]:
    """
    Everyone who may collect this child today, as (user, basis).

    Backs the guard's manual-fallback screen — the guard picks from this list
    and nothing else, so manual handover is constrained to the same set as a
    QR scan.
    """
    on_date = on_date or Date.today()
    out: list[tuple[User, str]] = []

    guardians = db.execute(
        select(User)
        .join(Guardianship, Guardianship.user_id == User.id)
        .where(Guardianship.student_id == student_id)
    ).scalars().all()
    out.extend((u, "guardian") for u in guardians)

    granted = db.execute(
        select(User, PickupAuthorization)
        .join(PickupAuthorization, PickupAuthorization.collector_user_id == User.id)
        .where(
            PickupAuthorization.student_id == student_id,
            PickupAuthorization.revoked_at.is_(None),
            PickupAuthorization.valid_from <= on_date,
        )
    ).all()

    seen = {u.id for u in guardians}
    for user, auth in granted:
        if user.id in seen:
            continue
        if auth.valid_until is not None and auth.valid_until < on_date:
            continue
        kind = "one_time" if auth.kind == AuthorizationKind.one_time else "standing"
        out.append((user, kind))
        seen.add(user.id)

    return out


# ── Visibility ─────────────────────────────────────────────────────────


#: Roles that legitimately need to see student records across a school.
#: A driver is deliberately absent. His only view of student data is
#: /me/manifest — the children whose parents linked him, today.
STAFF_ROLES = {Role.admin, Role.teacher, Role.guard}


def may_view_student(db: Session, *, viewer: User, student_id: uuid.UUID) -> bool:
    """
    Can this user see this child's record?

    Staff can, within their own school. A parent can, for their own children.
    Nobody else can — and specifically not a collector, however many children
    they are currently authorized to fetch.

    Being authorized to COLLECT a child is not the same as being allowed to
    READ their record. A driver needs a name and a face at the gate, which
    /me/manifest gives him. He does not need the child's guardians, their
    phone numbers, or the roster of everyone else in the class.
    """
    student = db.get(Student, student_id)
    if student is None:
        return False
    if student.school_id != viewer.school_id:
        return False
    if viewer.role in STAFF_ROLES:
        return True
    return (
        db.execute(
            select(Guardianship).where(
                Guardianship.student_id == student_id,
                Guardianship.user_id == viewer.id,
            )
        ).scalar_one_or_none()
        is not None
    )
