"""
A second, judge-facing school — separate from `seed.py`'s dataset.

`seed.py` is what Tehman and Hussnain are testing phones against right now,
with real seeded accounts (+923331000001 and friends). This script must never
touch those rows: it does not call `reset()`, does not wipe any shared table,
and every row it creates is scoped to its own `School`. If this school already
exists (by name), it does nothing — safe to run again during a deploy.

Judges log into the admin dashboard with the demo admin below, or use the
demo parent / driver numbers directly in the mobile apps. Today's queue is
pre-populated so the dashboard is never empty on first login.

    cd backend
    ./.venv/Scripts/python.exe ../scripts/seed_demo.py
"""

from __future__ import annotations

import sys
import uuid
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

from cryptography.hazmat.primitives import serialization  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import ec  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    AuthorizationKind,
    Guardianship,
    PickupAuthorization,
    PickupRequest,
    PickupStatus,
    RequestSource,
    Role,
    Schedule,
    School,
    SchoolClass,
    Student,
    Trip,
    User,
    Vehicle,
)
from app.security import hash_password  # noqa: E402

DEMO_SCHOOL_NAME = "Rukhsat Demo School"
DEMO_PASSWORD = "rukhsat123"
TODAY = date.today()
TZ = timezone(timedelta(hours=5))

#: Prefix distinct from every number `seed.py` uses, so nothing collides on
#: the `users.phone` unique constraint and a reader can tell "demo" from
#: "real test account" at a glance.
DEMO_ADMIN = "03009900001"
DEMO_TEACHER = "03009900002"
DEMO_GUARD = "03009900003"
DEMO_PARENT = "03009900010"  # two children — the sibling story
DEMO_PARENT_2 = "03009900011"
DEMO_DRIVER = "03009900020"


def at(hhmm: str) -> datetime:
    h, m = (int(x) for x in hhmm.split(":"))
    return datetime.combine(TODAY, time(h, m), tzinfo=TZ)


def generate_es256_keypair() -> tuple[str, str]:
    """Duplicated from seed.py rather than imported — `scripts` is a plain
    directory, not a package, and importing across sibling scripts here
    isn't worth the sys.path fragility for fifteen lines."""
    private = ec.generate_private_key(ec.SECP256R1())
    private_pem = private.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    public_pem = (
        private.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode()
    )
    return private_pem, public_pem


def seed_demo(db) -> bool:
    """Returns False (no-op) if the demo school already exists."""
    # Keyed on the demo admin's phone, not the school name. The name is
    # editable from the dashboard now, and once somebody renames the demo
    # school a name check stops matching and this script cheerfully seeds a
    # second copy of everything.
    existing = db.execute(
        select(User).where(User.phone == DEMO_ADMIN)
    ).scalar_one_or_none()
    if existing is not None:
        return False

    pw = hash_password(DEMO_PASSWORD)
    private_pem, public_pem = generate_es256_keypair()

    school = School(
        id=uuid.uuid4(),
        name=DEMO_SCHOOL_NAME,
        lat=33.6844,
        lng=73.0479,
        geofence_radius_m=1000,
        dismissal_time=time(13, 15),
        timezone="Asia/Karachi",
        public_key=public_pem,
        private_key_enc=private_pem,
    )
    db.add(school)
    db.flush()

    def mk_user(role: Role, name: str, name_ur: str | None, phone: str, locale: str, cnic: str | None = None) -> User:
        u = User(
            id=uuid.uuid4(), school_id=school.id, role=role, name=name,
            name_ur=name_ur, phone=phone, password_hash=pw, locale=locale, cnic=cnic,
        )
        db.add(u)
        return u

    admin = mk_user(Role.admin, "Demo Admin", "ڈیمو ایڈمن", DEMO_ADMIN, "en")
    teacher = mk_user(Role.teacher, "Ayesha Noor", "عائشہ نور", DEMO_TEACHER, "ur")
    guard = mk_user(Role.guard, "Demo Guard", "ڈیمو گارڈ", DEMO_GUARD, "ur")
    db.flush()

    cls = SchoolClass(id=uuid.uuid4(), school_id=school.id, name="Nursery — Demo", teacher_id=teacher.id)
    db.add(cls)
    db.flush()

    # Two families. p1 has siblings, so the queue shows the sibling grouping
    # that is the headline feature — a judge should see it without asking.
    parent_cnic = {"p1": "9990000000001", "p2": "9990000000002"}
    parent1 = mk_user(Role.parent, "Bilal Ahmed", "بلال احمد", DEMO_PARENT, "en", cnic=parent_cnic["p1"])
    parent2 = mk_user(Role.parent, "Sana Malik", "ثنا ملک", DEMO_PARENT_2, "ur", cnic=parent_cnic["p2"])
    driver = mk_user(Role.driver, "Kamal Yousuf", "کمال یوسف", DEMO_DRIVER, "ur")
    db.flush()

    db.add(Vehicle(id=uuid.uuid4(), school_id=school.id, driver_user_id=driver.id, registration_no="DEMO-0001", capacity=12))

    student_spec = [
        ("s1", "Zoya Ahmed", "زویا احمد", parent1, parent_cnic["p1"]),
        ("s2", "Rayan Ahmed", "ریان احمد", parent1, parent_cnic["p1"]),  # Zoya's sibling
        ("s3", "Ibrahim Malik", "ابراہیم ملک", parent2, parent_cnic["p2"]),
    ]
    students = {}
    for key, name, name_ur, parent, cnic in student_spec:
        s = Student(id=uuid.uuid4(), school_id=school.id, class_id=cls.id, name=name, name_ur=name_ur, guardian_cnic=cnic)
        db.add(s)
        students[key] = s
        db.flush()
        db.add(Guardianship(id=uuid.uuid4(), student_id=s.id, user_id=parent.id, relation="parent", is_primary=True, can_delegate=True))
    db.flush()

    # The driver collects all three children, across both families — exactly
    # the case a collector search endpoint could never express and a plain
    # phone-number lookup does.
    for key in ("s1", "s2", "s3"):
        db.add(PickupAuthorization(
            id=uuid.uuid4(), student_id=students[key].id, collector_user_id=driver.id,
            granted_by_user_id=(parent1 if key != "s3" else parent2).id,
            kind=AuthorizationKind.standing, valid_from=TODAY - timedelta(days=30),
        ))
    db.flush()

    for key, student in students.items():
        for weekday in range(5):
            db.add(Schedule(id=uuid.uuid4(), student_id=student.id, collector_id=driver.id, weekday=weekday, pickup_time=time(13, 15)))
    db.flush()

    # A trip already in progress, so the dashboard is never empty on first
    # login — a judge who arrives cold sees a live queue, not a blank state.
    trip = Trip(
        id=uuid.uuid4(), collector_user_id=driver.id, date=TODAY,
        started_at=at("12:58"), last_lat=33.6901, last_lng=73.0512,
        eta_seconds=95, entered_geofence_at=at("13:06"),
    )
    db.add(trip)
    db.flush()

    for key, status in [("s1", PickupStatus.NEARBY), ("s2", PickupStatus.NEARBY), ("s3", PickupStatus.EN_ROUTE)]:
        db.add(PickupRequest(
            id=uuid.uuid4(), student_id=students[key].id, collector_id=driver.id,
            trip_id=trip.id, date=TODAY, scheduled_time=time(13, 15),
            status=status, source=RequestSource.default,
        ))
    db.commit()
    return True


def main() -> None:
    with SessionLocal() as db:
        created = seed_demo(db)
    if created:
        print(f'created "{DEMO_SCHOOL_NAME}" — did not touch any other school\'s data\n')
        print("Demo credentials (password: rukhsat123 for all):\n")
        print(f"  admin    {DEMO_ADMIN}   (Demo Admin)")
        print(f"  parent   {DEMO_PARENT}   (Bilal Ahmed — two children)")
        print(f"  parent   {DEMO_PARENT_2}   (Sana Malik — one child)")
        print(f"  driver   {DEMO_DRIVER}   (Kamal Yousuf — collects all three)")
        print(f"  teacher  {DEMO_TEACHER}   (Ayesha Noor)")
        print(f"  guard    {DEMO_GUARD}   (Demo Guard)")
    else:
        print(f'"{DEMO_SCHOOL_NAME}" already exists — nothing to do. '
              f"(Rerunning is safe; it never duplicates.)")


if __name__ == "__main__":
    main()
