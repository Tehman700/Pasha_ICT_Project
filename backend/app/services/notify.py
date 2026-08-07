"""
What to say, in which language, and to whom.

`services/push.py` is the transport. This module owns the domain: it resolves
the guardians of a child, picks each one's language, and composes the message.

Three notifications exist, and no more:

  1. **Pickup reminder** — the schedule is the backstop, so a parent must be
     told before dismissal that someone is (or is not) coming.
  2. **Collector arrived** — fires with the classroom announcement.
  3. **Handed over** — the one that matters. If this is wrong, the parent must
     find out within seconds, not at 4pm.

There is deliberately **no teacher arrival push**. Voice replaces it — see
`docs/PROJECT_CONTEXT.md`. Adding it back would put a teacher's phone in her
hand thirty times an afternoon.

On naming the collector
-----------------------
The collector IS named, in both the arrival and handover messages. A lock
screen reading "Zara was handed to Ahmed Khan" is legible to anyone holding
the parent's phone, which is a real cost — but a parent seeing a name they did
not expect is the single most valuable alert this system produces, and
suppressing it to protect a lock screen would trade a safety signal for a
privacy nicety. The reminder, which carries no safety weight, stays vague.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Guardianship, Student, User
from app.services import push

log = logging.getLogger(__name__)


@dataclass
class Message:
    title: str
    body: str


def _name(user_or_student, locale: str) -> str:
    """Urdu name when we have one and the reader reads Urdu, else the Latin one."""
    if locale == "ur":
        return getattr(user_or_student, "name_ur", None) or user_or_student.name
    return user_or_student.name


# ── Copy ───────────────────────────────────────────────────────────────
#
# Every string exists in both languages in this file, not in a translation
# pass later. Urdu here is plain register — a notification is read in one
# glance at a lock screen, and formal Urdu costs a second of parsing.


def reminder(*, student_name: str, time_label: str, locale: str) -> Message:
    if locale == "ur":
        return Message(
            title="آج کی چھٹی",
            body=f"{student_name} کی چھٹی {time_label} بجے ہے۔",
        )
    return Message(
        title="Pickup today",
        body=f"{student_name} is scheduled for pickup at {time_label}.",
    )


def arrived(*, student_names: list[str], collector_name: str, locale: str) -> Message:
    who = _join(student_names, locale)
    if locale == "ur":
        return Message(
            title="گاڑی پہنچ رہی ہے",
            body=f"{collector_name} {who} کو لینے کے لیے پہنچ رہے ہیں۔",
        )
    return Message(
        title="Arriving now",
        body=f"{collector_name} is arriving to collect {who}.",
    )


def handed_over(*, student_name: str, collector_name: str, locale: str) -> Message:
    if locale == "ur":
        return Message(
            title="بچہ حوالے کر دیا گیا",
            body=f"{student_name} کو {collector_name} کے حوالے کر دیا گیا ہے۔",
        )
    return Message(
        title="Handed over",
        body=f"{student_name} has been handed over to {collector_name}.",
    )


def _join(names: list[str], locale: str) -> str:
    """"Ali and Sara" / "Ali، Sara اور Zoya" — Urdu uses its own comma."""
    if not names:
        return ""
    if len(names) == 1:
        return names[0]
    joiner = " اور " if locale == "ur" else " and "
    sep = "، " if locale == "ur" else ", "
    return sep.join(names[:-1]) + joiner + names[-1]


# ── Delivery ───────────────────────────────────────────────────────────


def _deliver(
    db: Session,
    *,
    user: User,
    message: Message,
    data: dict[str, str],
    collapse_key: str | None = None,
) -> str:
    """
    Send to one user and clear the token if FCM says it is dead.

    Clearing matters: an uninstalled app leaves a token that fails on every
    future send. Left alone, a term's worth of dead tokens turns each
    notification into a series of doomed HTTP round trips.
    """
    if not user.fcm_token:
        return push.DISABLED

    result = push.send(
        token=user.fcm_token,
        title=message.title,
        body=message.body,
        data=data,
        collapse_key=collapse_key,
    )

    if result == push.UNREGISTERED:
        user.fcm_token = None
        try:
            db.commit()
        except Exception:  # noqa: BLE001
            db.rollback()

    return result


def guardians_of(db: Session, student_id: uuid.UUID) -> list[User]:
    return list(
        db.execute(
            select(User)
            .join(Guardianship, Guardianship.user_id == User.id)
            .where(Guardianship.student_id == student_id, User.is_active.is_(True))
        ).scalars()
    )


def notify_arrival(
    db: Session,
    *,
    student_ids: list[uuid.UUID],
    collector: User,
    trip_id: uuid.UUID,
) -> int:
    """
    Tell each guardian their collector is arriving.

    Grouped per guardian, not per child: a parent of three siblings on one van
    gets one notification naming all three, not three notifications fifteen
    seconds apart.

    Never raises — a failure here must not stop the classroom announcement
    that fires alongside it.
    """
    try:
        by_user: dict[uuid.UUID, tuple[User, list[Student]]] = {}
        for sid in student_ids:
            student = db.get(Student, sid)
            if student is None:
                continue
            for guardian in guardians_of(db, sid):
                # A parent collecting her own child does not need telling that
                # she has arrived.
                if guardian.id == collector.id:
                    continue
                entry = by_user.setdefault(guardian.id, (guardian, []))
                entry[1].append(student)

        sent = 0
        for guardian, students in by_user.values():
            locale = guardian.locale or "en"
            msg = arrived(
                student_names=[_name(s, locale) for s in students],
                collector_name=_name(collector, locale),
                locale=locale,
            )
            result = _deliver(
                db,
                user=guardian,
                message=msg,
                data={"type": "arrival", "trip_id": str(trip_id)},
                # ETA moves; the tray should show the latest, not a history.
                collapse_key=f"arrival:{trip_id}",
            )
            if result == push.SENT:
                sent += 1
        return sent
    except Exception as exc:  # noqa: BLE001
        log.warning("arrival notification failed: %s", exc)
        return 0


def notify_handover(
    db: Session,
    *,
    student_id: uuid.UUID,
    collector: User,
    handover_id: uuid.UUID,
) -> int:
    """
    Tell each guardian their child has been released, and to whom.

    Sent per child rather than batched: this is the message a parent may need
    to act on, and "Zara and Ali were handed over" reads as one event when it
    is two. Never raises — the child is already through the gate.
    """
    try:
        student = db.get(Student, student_id)
        if student is None:
            return 0

        sent = 0
        for guardian in guardians_of(db, student_id):
            locale = guardian.locale or "en"
            msg = handed_over(
                student_name=_name(student, locale),
                collector_name=_name(collector, locale),
                locale=locale,
            )
            result = _deliver(
                db,
                user=guardian,
                message=msg,
                data={
                    "type": "handover",
                    "handover_id": str(handover_id),
                    "student_id": str(student_id),
                },
                # No collapse key. Two children handed over must produce two
                # notifications — collapsing them would hide one release.
            )
            if result == push.SENT:
                sent += 1
        return sent
    except Exception as exc:  # noqa: BLE001
        log.warning("handover notification failed: %s", exc)
        return 0


def notify_reminder(
    db: Session,
    *,
    student_id: uuid.UUID,
    time_label: str,
    request_id: uuid.UUID,
) -> int:
    """Morning-of reminder that a pickup is scheduled. Never raises."""
    try:
        student = db.get(Student, student_id)
        if student is None:
            return 0

        sent = 0
        for guardian in guardians_of(db, student_id):
            locale = guardian.locale or "en"
            msg = reminder(
                student_name=_name(student, locale),
                time_label=time_label,
                locale=locale,
            )
            result = _deliver(
                db,
                user=guardian,
                message=msg,
                data={"type": "reminder", "request_id": str(request_id)},
                collapse_key=f"reminder:{student_id}",
            )
            if result == push.SENT:
                sent += 1
        return sent
    except Exception as exc:  # noqa: BLE001
        log.warning("reminder notification failed: %s", exc)
        return 0
