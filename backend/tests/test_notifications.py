"""
Push notifications — M8.2.

The FCM transport is stubbed everywhere here. What is actually under test is
the part that can go wrong quietly: who gets told, in which language, whether
a dead token is cleaned up, and whether a failing notification can take down
the handover that triggered it.
"""

from __future__ import annotations

import uuid
from datetime import date as Date, time

import pytest
from sqlalchemy.orm import Session

from app.models import (
    Guardianship,
    PickupRequest,
    PickupStatus,
    RequestSource,
    Role,
    School,
    SchoolClass,
    Student,
    User,
)
from app.services import notify, push


@pytest.fixture
def sent(monkeypatch):
    """Capture every send instead of talking to Google."""
    calls: list[dict] = []

    def _fake(*, token, title, body, data=None, collapse_key=None):
        calls.append(
            {
                "token": token,
                "title": title,
                "body": body,
                "data": data,
                "collapse_key": collapse_key,
            }
        )
        return push.SENT

    monkeypatch.setattr(push, "send", _fake)
    monkeypatch.setattr(notify.push, "send", _fake)
    return calls


@pytest.fixture
def family(db: Session, school: School, make_user):
    """One child, two guardians reading different languages, one collector."""
    cls = SchoolClass(
        id=uuid.uuid4(), school_id=school.id, name="Nursery A", teacher_id=None
    )
    db.add(cls)
    db.flush()

    student = Student(
        id=uuid.uuid4(),
        school_id=school.id,
        class_id=cls.id,
        name="Zara Raza",
        name_ur="زارا رضا",
    )
    db.add(student)
    db.flush()

    mother = make_user(role=Role.parent, locale="ur", name="Nasreen Malik")
    mother.name_ur = "نسرین ملک"
    mother.fcm_token = "token-mother"

    father = make_user(role=Role.parent, locale="en", name="Tariq Raza")
    father.fcm_token = "token-father"

    driver = make_user(role=Role.driver, name="Ahmed Khan")
    driver.name_ur = "احمد خان"

    for u in (mother, father):
        db.add(
            Guardianship(
                id=uuid.uuid4(), student_id=student.id, user_id=u.id, relation="parent"
            )
        )
    db.flush()
    return {"student": student, "mother": mother, "father": father, "driver": driver}


# ── Language ───────────────────────────────────────────────────────────


def test_each_guardian_is_written_to_in_their_own_language(db, family, sent):
    notify.notify_handover(
        db,
        student_id=family["student"].id,
        collector=family["driver"],
        handover_id=uuid.uuid4(),
    )

    by_token = {c["token"]: c for c in sent}
    assert by_token["token-mother"]["title"] == "بچہ حوالے کر دیا گیا"
    assert by_token["token-father"]["title"] == "Handed over"

    # And the NAMES follow the reader's language, not the database's default.
    assert "زارا رضا" in by_token["token-mother"]["body"]
    assert "احمد خان" in by_token["token-mother"]["body"]
    assert "Zara Raza" in by_token["token-father"]["body"]
    assert "Ahmed Khan" in by_token["token-father"]["body"]


def test_a_guardian_with_no_urdu_name_falls_back_rather_than_showing_blank(db, family, sent):
    family["student"].name_ur = None
    db.flush()

    notify.notify_handover(
        db,
        student_id=family["student"].id,
        collector=family["driver"],
        handover_id=uuid.uuid4(),
    )
    urdu = next(c for c in sent if c["token"] == "token-mother")
    assert "Zara Raza" in urdu["body"]


# ── Who gets told ──────────────────────────────────────────────────────


def test_a_parent_collecting_her_own_child_is_not_told_she_has_arrived(db, family, sent):
    notify.notify_arrival(
        db,
        student_ids=[family["student"].id],
        collector=family["mother"],
        trip_id=uuid.uuid4(),
    )
    tokens = {c["token"] for c in sent}
    assert "token-mother" not in tokens
    assert "token-father" in tokens


def test_a_guardian_with_no_token_is_skipped_without_erroring(db, family, sent):
    family["father"].fcm_token = None
    db.flush()

    notify.notify_handover(
        db,
        student_id=family["student"].id,
        collector=family["driver"],
        handover_id=uuid.uuid4(),
    )
    assert [c["token"] for c in sent] == ["token-mother"]


def test_siblings_on_one_trip_are_one_arrival_notification_not_three(db, family, sent, school):
    """A parent of three on the same van should not get three buzzes."""
    cls_id = family["student"].class_id
    extra = []
    for name in ("Ali Raza", "Omar Raza"):
        s = Student(
            id=uuid.uuid4(), school_id=school.id, class_id=cls_id, name=name
        )
        db.add(s)
        db.flush()
        db.add(
            Guardianship(
                id=uuid.uuid4(),
                student_id=s.id,
                user_id=family["father"].id,
                relation="parent",
            )
        )
        extra.append(s)
    db.flush()

    notify.notify_arrival(
        db,
        student_ids=[family["student"].id] + [s.id for s in extra],
        collector=family["driver"],
        trip_id=uuid.uuid4(),
    )

    father = [c for c in sent if c["token"] == "token-father"]
    assert len(father) == 1
    assert "Zara Raza" in father[0]["body"]
    assert "Ali Raza" in father[0]["body"]
    assert "Omar Raza" in father[0]["body"]


def test_handovers_are_never_collapsed_together(db, family, sent):
    """Two children released must leave two notifications, not one."""
    notify.notify_handover(
        db,
        student_id=family["student"].id,
        collector=family["driver"],
        handover_id=uuid.uuid4(),
    )
    assert all(c["collapse_key"] is None for c in sent)


def test_arrival_collapses_so_a_moving_eta_leaves_one_notification(db, family, sent):
    trip_id = uuid.uuid4()
    notify.notify_arrival(
        db, student_ids=[family["student"].id], collector=family["driver"], trip_id=trip_id
    )
    assert all(c["collapse_key"] == f"arrival:{trip_id}" for c in sent)


# ── Dead tokens ────────────────────────────────────────────────────────


def test_an_unregistered_token_is_cleared_from_the_account(db, family, monkeypatch):
    """
    An uninstalled app must not leave a token that fails forever. Without this,
    every future send pays for a doomed round trip per dead device.
    """
    monkeypatch.setattr(push, "send", lambda **kw: push.UNREGISTERED)
    monkeypatch.setattr(notify.push, "send", lambda **kw: push.UNREGISTERED)

    notify.notify_handover(
        db,
        student_id=family["student"].id,
        collector=family["driver"],
        handover_id=uuid.uuid4(),
    )
    db.refresh(family["mother"])
    db.refresh(family["father"])
    assert family["mother"].fcm_token is None
    assert family["father"].fcm_token is None


def test_a_merely_failed_send_does_not_clear_the_token(db, family, monkeypatch):
    """A network blip is not a dead device — clearing here would silently
    unsubscribe a working phone."""
    monkeypatch.setattr(push, "send", lambda **kw: push.FAILED)
    monkeypatch.setattr(notify.push, "send", lambda **kw: push.FAILED)

    notify.notify_handover(
        db,
        student_id=family["student"].id,
        collector=family["driver"],
        handover_id=uuid.uuid4(),
    )
    db.refresh(family["mother"])
    assert family["mother"].fcm_token == "token-mother"


# ── Failure containment ────────────────────────────────────────────────


def test_a_raising_transport_cannot_break_the_handover(db, family, monkeypatch):
    """
    The child is already through the gate. A notification failure must be a
    logged warning, never an exception that reaches the guard's screen.
    """

    def _explode(**kwargs):
        raise RuntimeError("FCM is down")

    monkeypatch.setattr(push, "send", _explode)
    monkeypatch.setattr(notify.push, "send", _explode)

    assert (
        notify.notify_handover(
            db,
            student_id=family["student"].id,
            collector=family["driver"],
            handover_id=uuid.uuid4(),
        )
        == 0
    )


def test_a_missing_student_is_survivable(db, family, sent):
    assert (
        notify.notify_handover(
            db,
            student_id=uuid.uuid4(),
            collector=family["driver"],
            handover_id=uuid.uuid4(),
        )
        == 0
    )
    assert sent == []


# ── Transport ──────────────────────────────────────────────────────────


def test_push_is_a_no_op_when_no_credentials_are_configured(monkeypatch):
    """
    Local dev and CI have no Firebase key. The system must run, not error.
    """
    push.reset_cache()
    monkeypatch.setattr(
        push.settings, "fcm_service_account_json_path", "./does-not-exist.json"
    )
    try:
        assert push.enabled() is False
        assert push.send(token="x", title="t", body="b") == push.DISABLED
    finally:
        push.reset_cache()


def test_an_empty_token_never_reaches_the_network(monkeypatch):
    called = {"n": 0}
    monkeypatch.setattr(push, "_access_token", lambda: called.__setitem__("n", 1))
    assert push.send(token="", title="t", body="b") == push.DISABLED
    assert called["n"] == 0


# ── Copy ───────────────────────────────────────────────────────────────


def test_urdu_list_uses_the_urdu_comma_and_conjunction():
    assert notify._join(["الف", "ب", "ج"], "ur") == "الف، ب اور ج"
    assert notify._join(["Ali", "Sara"], "en") == "Ali and Sara"
    assert notify._join(["Ali"], "en") == "Ali"
    assert notify._join([], "en") == ""


def test_every_message_exists_in_both_languages():
    """Urdu is a Tier 1 requirement, not a later polish pass."""
    for en, ur in (
        (
            notify.reminder(student_name="Z", time_label="1:15 PM", locale="en"),
            notify.reminder(student_name="Z", time_label="1:15 PM", locale="ur"),
        ),
        (
            notify.arrived(student_names=["Z"], collector_name="A", locale="en"),
            notify.arrived(student_names=["Z"], collector_name="A", locale="ur"),
        ),
        (
            notify.handed_over(student_name="Z", collector_name="A", locale="en"),
            notify.handed_over(student_name="Z", collector_name="A", locale="ur"),
        ),
    ):
        assert en.title and en.body
        assert ur.title and ur.body
        assert en.title != ur.title, "Urdu string is missing — it fell back to English"


# ── Reminder job ───────────────────────────────────────────────────────


def test_reminder_time_label_does_not_use_a_glibc_only_format(db, family, school):
    """`%-I` raises on Windows, where these tests run."""
    from app.jobs.reminders import _time_label

    req = PickupRequest(
        id=uuid.uuid4(),
        student_id=family["student"].id,
        collector_id=family["driver"].id,
        date=Date.today(),
        scheduled_time=time(13, 5),
        status=PickupStatus.SCHEDULED,
        source=RequestSource.default,
    )
    assert _time_label(req, "en") == "1:05 PM"

    req.scheduled_time = time(0, 30)
    assert _time_label(req, "en") == "12:30 AM"
    req.scheduled_time = time(12, 0)
    assert _time_label(req, "en") == "12:00 PM"


def test_the_reminder_job_declines_to_run_when_the_lock_is_unavailable(monkeypatch, db):
    """
    Two uvicorn workers each run their own scheduler. Without the Redis claim
    every parent is notified twice, and a push cannot be un-sent — so losing
    Redis must mean "send nothing", not "send twice".
    """
    from app.jobs import reminders

    monkeypatch.setattr(reminders.push, "enabled", lambda: True)
    monkeypatch.setattr(reminders, "_claim", lambda key: False)

    fired: list = []
    monkeypatch.setattr(
        reminders.notify, "notify_reminder", lambda *a, **k: fired.append(1) or 1
    )

    result = reminders.send_reminders_for(db, Date.today())
    assert result["sent"] == 0
    assert fired == []
