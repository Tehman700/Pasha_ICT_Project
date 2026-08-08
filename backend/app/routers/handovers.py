"""
Handovers — the moment a child is released, and the audit trail of it.

Two paths, one rule: **authorization is enforced for both**. Manual means the
QR could not be scanned, never that the check was waived. A guard can only ever
release a child to someone the child's own parent authorized.

Manual handovers are logged with the guard's identity, the device, a required
reason, and surface flagged on the admin dashboard. That is a designed-in
strength to present, not a weakness to hide: a dead phone must never be the
reason a real handover cannot happen.
"""

from __future__ import annotations

import uuid
from datetime import date as Date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db, utcnow
from app.deps import get_current_user, require_guard
from app.models import (
    AuditLog,
    Handover,
    HandoverMethod,
    PickupRequest,
    PickupStatus,
    Student,
    Trip,
    User,
)
from app.schemas import HandoverIn, HandoverOut
from app.services import broadcast, notify
from app.services.authorization import may_collect

router = APIRouter()


class HandoverRefused(Exception):
    """
    A handover that cannot proceed.

    Deliberately not an HTTPException: `_record` must not decide how the
    failure is reported, because the batch endpoint reports per item rather
    than failing the request. It also carries the audit payload so the caller
    can persist the refusal AFTER rolling back the attempt — a refused
    collection must leave a record even though nothing else about it is kept.
    """

    def __init__(self, status_code: int, detail: str, audit: dict | None = None):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.audit = audit


def _log_refusal(db: Session, *, guard: User, request_id: uuid.UUID, audit: dict) -> None:
    db.add(
        AuditLog(
            id=uuid.uuid4(),
            school_id=guard.school_id,
            actor_user_id=guard.id,
            action="handover.refused",
            entity_type="pickup_request",
            entity_id=request_id,
            payload=audit,
            flagged=True,
            created_at=utcnow(),
        )
    )


def _record(
    db: Session,
    *,
    guard: User,
    body: HandoverIn,
) -> Handover:
    """
    Shared path for live and synced handovers.

    Never commits and never rolls back — the caller owns the transaction, so
    the batch endpoint can scope each item to its own savepoint.
    """
    req = db.get(PickupRequest, body.pickup_request_id)
    if req is None:
        raise HandoverRefused(status.HTTP_404_NOT_FOUND, "No such pickup request")

    existing = db.execute(
        select(Handover).where(Handover.pickup_request_id == req.id)
    ).scalar_one_or_none()
    if existing is not None:
        # Idempotent: an offline batch may be uploaded twice, and a child must
        # never be recorded as handed over to two different people.
        raise HandoverRefused(
            status.HTTP_409_CONFLICT, "This child has already been handed over"
        )

    if body.method == HandoverMethod.manual and body.fallback_reason is None:
        raise HandoverRefused(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "A manual handover requires a reason",
        )

    verdict = may_collect(
        db,
        collector_id=req.collector_id,
        student_id=req.student_id,
        on_date=req.date,
    )
    if not verdict.allowed:
        student = db.get(Student, req.student_id)
        raise HandoverRefused(
            status.HTTP_403_FORBIDDEN,
            f"Not authorized to collect this child ({verdict.reason})",
            audit={
                "reason": verdict.reason,
                "student": student.name if student else None,
                "method": body.method.value,
            },
        )

    handover = Handover(
        id=uuid.uuid4(),
        pickup_request_id=req.id,
        verified_by_user_id=guard.id,
        collector_user_id=req.collector_id,
        method=body.method,
        fallback_reason=body.fallback_reason,
        # An offline handover carries the time it actually happened at the
        # gate, not the time it reached the server.
        verified_at=body.verified_at or utcnow(),
        device_id=body.device_id,
        qr_jti=body.qr_token,
    )
    db.add(handover)

    req.status = PickupStatus.HANDED_OVER

    student = db.get(Student, req.student_id)
    collector = db.get(User, req.collector_id)
    db.add(
        AuditLog(
            id=uuid.uuid4(),
            school_id=guard.school_id,
            actor_user_id=guard.id,
            action=f"handover.{body.method.value}",
            entity_type="handover",
            entity_id=handover.id,
            payload={
                "student": student.name if student else None,
                "collector": collector.name if collector else None,
                "basis": verdict.basis,
                **(
                    {"reason": body.fallback_reason.value}
                    if body.fallback_reason
                    else {}
                ),
            },
            # Manual handovers are surfaced for review. QR ones are routine.
            flagged=body.method == HandoverMethod.manual,
            created_at=utcnow(),
        )
    )

    # A trip completes only when every child on it is gone. This is what makes
    # a van of six children one journey rather than six.
    if req.trip_id:
        siblings = db.execute(
            select(PickupRequest).where(PickupRequest.trip_id == req.trip_id)
        ).scalars().all()
        if all(s.status == PickupStatus.HANDED_OVER for s in siblings):
            trip = db.get(Trip, req.trip_id)
            if trip and trip.arrived_at is None:
                trip.arrived_at = utcnow()
            if trip and trip.ended_at is None:
                trip.ended_at = utcnow()

    return handover


@router.post(
    "/handovers",
    response_model=HandoverOut,
    status_code=status.HTTP_201_CREATED,
    tags=["handovers"],
)
def create_handover(
    body: HandoverIn,
    guard: User = Depends(require_guard),
    db: Session = Depends(get_db),
):
    savepoint = db.begin_nested()
    try:
        handover = _record(db, guard=guard, body=body)
    except HandoverRefused as refused:
        savepoint.rollback()
        # The attempt is discarded; the record of it is not.
        if refused.audit:
            _log_refusal(
                db, guard=guard, request_id=body.pickup_request_id, audit=refused.audit
            )
            db.commit()
        raise HTTPException(refused.status_code, refused.detail) from None

    savepoint.commit()
    db.commit()
    db.refresh(handover)
    broadcast.queue_changed(school_id=guard.school_id, reason="handover")
    _notify_guardians(db, handover)
    return HandoverOut.model_validate(handover)


def _notify_guardians(db: Session, handover: Handover) -> None:
    """
    Push "your child was handed to X" — strictly after the commit.

    After, not before: a notification that a handover happened must never be
    sent for a handover that then rolls back. The parent acting on a false
    alarm is worse than a real one arriving a second late.
    """
    req = db.get(PickupRequest, handover.pickup_request_id)
    collector = db.get(User, handover.collector_user_id)
    if req is None or collector is None:
        return
    notify.notify_handover(
        db,
        student_id=req.student_id,
        collector=collector,
        handover_id=handover.id,
    )


@router.post("/handovers/sync", tags=["handovers"])
def sync_handovers(
    body: list[HandoverIn],
    guard: User = Depends(require_guard),
    db: Session = Depends(get_db),
):
    """
    Upload handovers confirmed while offline.

    Per-item results rather than all-or-nothing: one already-synced child must
    not block the other eleven from a van. The gate never blocks on the network,
    so this endpoint has to tolerate replays.
    """
    results = []
    for item in body:
        # A SAVEPOINT per item, not a session-wide rollback. Rolling back the
        # whole session would discard the items already accepted in this batch.
        savepoint = db.begin_nested()
        try:
            handover = _record(db, guard=guard, body=item)
            savepoint.commit()
            db.commit()
            # A replayed item raises HandoverRefused above and never reaches
            # here, so reconnecting after an hour offline cannot re-notify a
            # parent about a handover she was already told about.
            _notify_guardians(db, handover)
            results.append(
                {
                    "pickup_request_id": str(item.pickup_request_id),
                    "accepted": True,
                    "reason": None,
                }
            )
        except HandoverRefused as refused:
            savepoint.rollback()
            if refused.audit:
                _log_refusal(
                    db,
                    guard=guard,
                    request_id=item.pickup_request_id,
                    audit=refused.audit,
                )
                db.commit()
            results.append(
                {
                    "pickup_request_id": str(item.pickup_request_id),
                    "accepted": False,
                    "reason": refused.detail,
                }
            )
    return results


@router.get("/handovers", response_model=list[HandoverOut], tags=["handovers"])
def list_handovers(
    date: Date | None = None,
    limit: int = Query(100, ge=1, le=500),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Handover)
        .join(PickupRequest, PickupRequest.id == Handover.pickup_request_id)
        .order_by(Handover.verified_at.desc())
        .limit(limit)
    )
    if date:
        stmt = stmt.where(PickupRequest.date == date)
    rows = db.execute(stmt).scalars().all()
    return [HandoverOut.model_validate(r) for r in rows]


@router.post("/pickup-requests/{request_id}/stage", tags=["pickup-requests"])
def mark_staged(
    request_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Teacher marks a child brought to the gate.

    Staging is separate from verification on purpose: teachers cannot stand at
    the gate, so the teacher stages and the guard verifies. That split is what
    makes this deployable rather than merely demoable.
    """
    req = db.get(PickupRequest, request_id)
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such pickup request")
    if req.status == PickupStatus.HANDED_OVER:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already handed over")

    req.status = PickupStatus.AT_GATE
    student = db.get(Student, req.student_id)
    db.add(
        AuditLog(
            id=uuid.uuid4(),
            school_id=user.school_id,
            actor_user_id=user.id,
            action="pickup_request.stage",
            entity_type="pickup_request",
            entity_id=req.id,
            payload={"student": student.name if student else None},
            flagged=False,
            created_at=utcnow(),
        )
    )
    db.commit()
    db.refresh(req)
    broadcast.queue_changed(school_id=user.school_id, reason="staged")
    return {"id": str(req.id), "status": req.status.value}
