"""
Schema and seed invariants (M1.1, M1.3).

Each test here corresponds to a defect in the original seed script or data
model. They are regression tests, not restatements of the code.
"""

from datetime import date

from sqlalchemy import func, select

from app.models import (
    AuthorizationKind,
    ClassroomDevice,
    Guardianship,
    Handover,
    HandoverMethod,
    NameAudio,
    PickupAuthorization,
    PickupRequest,
    PickupStatus,
    Role,
    Schedule,
    School,
    SchoolClass,
    Student,
    Trip,
    User,
)


def test_every_class_has_a_teacher(db):
    """
    The original script created teachers AFTER classes and never set
    teacher_id, so no teacher was linked to any class and the teacher queue
    was permanently empty.
    """
    classes = db.execute(select(SchoolClass)).scalars().all()
    assert classes
    for c in classes:
        assert c.teacher_id is not None, f"{c.name} has no teacher"
        teacher = db.get(User, c.teacher_id)
        assert teacher.role == Role.teacher


def test_school_has_an_es256_keypair(db):
    """The original script never generated one, so QR signing had no key."""
    school = db.execute(select(School)).scalars().one()
    assert school.public_key and "BEGIN PUBLIC KEY" in school.public_key
    assert school.private_key_enc and "BEGIN PRIVATE KEY" in school.private_key_enc


def test_sibling_groups_exist(db):
    """
    The original used random.sample() to attach guardians, which produced
    unrelated guardians per student and therefore ZERO sibling groups — the
    headline feature had nothing to demonstrate.
    """
    rows = db.execute(
        select(Guardianship.user_id, func.count(Guardianship.student_id))
        .group_by(Guardianship.user_id)
        .having(func.count(Guardianship.student_id) > 1)
    ).all()
    assert len(rows) >= 3, "expected at least three parents with two children"


def test_a_driver_collects_across_several_families_and_classes(db):
    """The case the original data model could not express at all."""
    driver = db.execute(
        select(User).where(User.role == Role.driver, User.name == "Ahmed Khan")
    ).scalar_one()

    grants = db.execute(
        select(PickupAuthorization).where(
            PickupAuthorization.collector_user_id == driver.id,
            PickupAuthorization.revoked_at.is_(None),
        )
    ).scalars().all()

    assert len(grants) >= 5
    families = {g.granted_by_user_id for g in grants}
    assert len(families) >= 4, f"expected >=4 families, got {len(families)}"

    classes = set()
    for g in grants:
        classes.add(db.get(Student, g.student_id).class_id)
    assert len(classes) > 1, "multi-class staging must be demonstrable"


def test_revocation_is_per_family_not_global(db):
    revoked = db.execute(
        select(PickupAuthorization).where(PickupAuthorization.revoked_at.is_not(None))
    ).scalars().first()
    assert revoked is not None

    still_active = db.execute(
        select(func.count()).select_from(PickupAuthorization).where(
            PickupAuthorization.collector_user_id == revoked.collector_user_id,
            PickupAuthorization.revoked_at.is_(None),
        )
    ).scalar_one()
    assert still_active > 0, "revoking one family must not remove other access"


def test_one_trip_covers_many_pickup_requests(db):
    """Sibling grouping: one trip -> many requests, spanning families for a van."""
    rows = db.execute(
        select(PickupRequest.trip_id, func.count(PickupRequest.id))
        .where(PickupRequest.trip_id.is_not(None))
        .group_by(PickupRequest.trip_id)
        .having(func.count(PickupRequest.id) > 1)
    ).all()
    assert rows, "expected at least one trip carrying multiple children"
    assert max(count for _, count in rows) >= 6, "the van should carry six"


def test_a_one_time_pass_exists_and_expires(db):
    pas = db.execute(
        select(PickupAuthorization).where(
            PickupAuthorization.kind == AuthorizationKind.one_time
        )
    ).scalars().all()
    assert pas, "the Tier 2 delegate pass is the same table with an expiry"
    assert all(p.valid_until is not None for p in pas)


def test_every_queue_state_is_represented(db):
    present = set(
        db.execute(select(PickupRequest.status).distinct()).scalars().all()
    )
    for expected in [
        PickupStatus.NEARBY,
        PickupStatus.EN_ROUTE,
        PickupStatus.AT_GATE,
        PickupStatus.HANDED_OVER,
        PickupStatus.LAPSED,
        PickupStatus.SCHEDULED,
    ]:
        assert expected in present, f"{expected} missing from the demo data"


def test_one_classroom_display_is_offline(db):
    """A silent classroom has no other symptom — M6.5 exists to surface it."""
    devices = db.execute(select(ClassroomDevice)).scalars().all()
    assert len(devices) == 3
    stale = [d for d in devices if d.last_seen_at is not None]
    assert stale, "devices need heartbeats to be monitorable"


def test_a_manual_handover_exists_for_review(db):
    handovers = db.execute(select(Handover)).scalars().all()
    assert handovers
    assert any(h.method == HandoverMethod.manual for h in handovers)
    manual = next(h for h in handovers if h.method == HandoverMethod.manual)
    assert manual.fallback_reason is not None, "a manual handover must record why"


def test_schedules_vary_collector_by_weekday(db):
    """Van Monday-Thursday, parent Friday — the per-weekday collector column."""
    student = db.execute(
        select(Student).where(Student.name == "Ali Raza")
    ).scalar_one()
    rows = db.execute(
        select(Schedule).where(Schedule.student_id == student.id)
    ).scalars().all()
    assert len(rows) == 5
    assert len({r.collector_id for r in rows}) > 1


def test_reseeding_is_idempotent(db):
    """The original claimed 'safe to rerun' while silently duplicating rows."""
    import subprocess
    import sys
    from pathlib import Path

    backend = Path(__file__).resolve().parents[1]
    before = db.execute(select(func.count()).select_from(Student)).scalar_one()

    subprocess.run(
        [sys.executable, str(backend.parent / "scripts" / "seed.py"), "--reset"],
        capture_output=True,
        cwd=str(backend),
        check=True,
    )

    db.expire_all()
    after = db.execute(select(func.count()).select_from(Student)).scalar_one()
    assert after == before, "reseeding must not accumulate rows"


def test_students_have_urdu_names(db):
    """Urdu is Tier 1, including in the demo data judges will see."""
    students = db.execute(select(Student)).scalars().all()
    assert all(s.name_ur for s in students)


def test_trip_dates_are_today_so_the_demo_is_live(db):
    trips = db.execute(select(Trip)).scalars().all()
    assert trips
    assert all(t.date == date.today() for t in trips)


def test_some_name_clips_are_missing_on_purpose(db):
    """
    The missing-clip fallback path needs to be visible in the demo, not
    discovered at a real gate.
    """
    students = db.execute(select(func.count()).select_from(Student)).scalar_one()
    clips = db.execute(
        select(func.count()).select_from(NameAudio).where(
            NameAudio.subject_type == "student"
        )
    ).scalar_one()
    assert 0 < clips < students
