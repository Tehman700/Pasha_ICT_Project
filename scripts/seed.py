"""
Demo dataset for Rukhsat.

Rewrite of the original script, which produced a dataset that could not demo:

  1. omitted `password_hash` entirely -> no seeded user could log in, and the
     insert fails outright against a NOT NULL column
  2. omitted `classes.teacher_id` AND created teachers after classes -> no
     teacher was linked to any class, so the teacher queue was always empty
  3. omitted the school's ES256 keypair -> QR signing had no key
  4. picked guardians with `random.sample(...)`, giving each student unrelated
     guardians -> ZERO sibling groups, so the headline feature had nothing
     to demonstrate
  5. claimed "safe to rerun" while never clearing -> silently duplicated rows
  6. hardcoded DATABASE_URL instead of reading the environment

It is now deterministic (fixed seed) and genuinely idempotent: --reset wipes
the tables it owns before inserting.

    cd backend
    ./.venv/Scripts/python.exe ../scripts/seed.py --reset
"""

from __future__ import annotations

import argparse
import random
import sys
import uuid
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

from cryptography.hazmat.primitives import serialization  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import ec  # noqa: E402
from sqlalchemy import delete, select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    Announcement,
    Audience,
    AuditLog,
    AuthorizationKind,
    ClassroomDevice,
    FallbackReason,
    Guardianship,
    Handover,
    HandoverMethod,
    NameAudio,
    AudioSubject,
    PickupAuthorization,
    PickupRequest,
    PickupStatus,
    RequestSource,
    Role,
    Schedule,
    School,
    SchoolClass,
    SpokenAnnouncement,
    Student,
    Trip,
    User,
    Vehicle,
)
from app.security import hash_password  # noqa: E402

random.seed(20260806)

DEMO_PASSWORD = "rukhsat123"
TODAY = date.today()
TZ = timezone(timedelta(hours=5))  # Asia/Karachi


def at(hhmm: str) -> datetime:
    h, m = (int(x) for x in hhmm.split(":"))
    return datetime.combine(TODAY, time(h, m), tzinfo=TZ)


def generate_es256_keypair() -> tuple[str, str]:
    """The original script never created this, so QR signing had no key."""
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


# Every table this script owns, in reverse FK order.
OWNED_TABLES = [
    SpokenAnnouncement,
    Handover,
    AuditLog,
    PickupRequest,
    Trip,
    Schedule,
    PickupAuthorization,
    Guardianship,
    NameAudio,
    ClassroomDevice,
    Announcement,
    Vehicle,
    Student,
    SchoolClass,
    User,
    School,
]


def reset(db) -> None:
    for model in OWNED_TABLES:
        db.execute(delete(model))
    db.commit()
    print("cleared existing demo data")


def seed(db) -> None:
    pw = hash_password(DEMO_PASSWORD)
    private_pem, public_pem = generate_es256_keypair()

    school = School(
        id=uuid.uuid4(),
        name="Roots Montessori — Islamabad",
        lat=33.6844,
        lng=73.0479,
        geofence_radius_m=1000,
        dismissal_time=time(13, 15),
        timezone="Asia/Karachi",
        public_key=public_pem,
        private_key_enc=private_pem,  # encrypted at rest in production
    )
    db.add(school)
    db.flush()

    def mk_user(role: Role, name: str, name_ur: str | None, phone: str, locale: str) -> User:
        u = User(
            id=uuid.uuid4(),
            school_id=school.id,
            role=role,
            name=name,
            name_ur=name_ur,
            phone=phone,
            password_hash=pw,
            locale=locale,
        )
        db.add(u)
        return u

    admin = mk_user(Role.admin, "Imran Qureshi", "عمران قریشی", "+923001112233", "en")
    guard = mk_user(Role.guard, "Main Gate Guard", "مین گیٹ گارڈ", "+923007778899", "ur")

    # Teachers are created BEFORE classes so every class gets a real teacher_id.
    t_nur = mk_user(Role.teacher, "Sadia Iqbal", "سعدیہ اقبال", "+923004445566", "ur")
    t_pra = mk_user(Role.teacher, "Nadia Sheikh", "نادیہ شیخ", "+923004445567", "ur")
    t_prb = mk_user(Role.teacher, "Rabia Khan", "رابعہ خان", "+923004445568", "en")
    db.flush()

    classes = {}
    for key, cname, teacher in [
        ("nur", "Nursery", t_nur),
        ("pra", "Prep A", t_pra),
        ("prb", "Prep B", t_prb),
    ]:
        c = SchoolClass(
            id=uuid.uuid4(), school_id=school.id, name=cname, teacher_id=teacher.id
        )
        db.add(c)
        classes[key] = c
    db.flush()

    # Parents. Deliberate sibling groups, not random pairing.
    parents = {}
    for key, name, name_ur, phone, locale in [
        ("p1", "Tariq Raza", "طارق رضا", "+923331000001", "en"),
        ("p2", "Nasreen Malik", "نسرین ملک", "+923331000002", "ur"),
        ("p3", "Kamran Butt", "کامران بٹ", "+923331000003", "en"),
        ("p4", "Shazia Sheikh", "شازیہ شیخ", "+923331000004", "ur"),
        ("p5", "Junaid Hassan", "جنید حسن", "+923331000005", "en"),
        ("p6", "Farah Iqbal", "فرح اقبال", "+923331000006", "ur"),
    ]:
        parents[key] = mk_user(Role.parent, name, name_ur, phone, locale)

    # A relative added directly by a parent — the non-vetted path.
    granny = mk_user(
        Role.parent, "Rukhsana Bibi", "رخسانہ بی بی", "+923331000090", "ur"
    )

    # Drivers — school-registered and vetted.
    d1 = mk_user(Role.driver, "Ahmed Khan", "احمد خان", "+923215000011", "ur")
    d2 = mk_user(Role.driver, "Yousaf Gul", "یوسف گل", "+923215000012", "ur")
    db.flush()

    db.add_all(
        [
            Vehicle(
                id=uuid.uuid4(), school_id=school.id, driver_user_id=d1.id,
                registration_no="ICT-2291", capacity=12,
            ),
            Vehicle(
                id=uuid.uuid4(), school_id=school.id, driver_user_id=d2.id,
                registration_no="ICT-8834", capacity=8,
            ),
        ]
    )

    # (key, name, name_ur, class, guardian) — p1 and p2 each have two children.
    student_spec = [
        ("s01", "Ali Raza", "علی رضا", "nur", "p1"),
        ("s02", "Sara Malik", "سارہ ملک", "nur", "p2"),
        ("s03", "Hamza Butt", "حمزہ بٹ", "nur", "p3"),
        ("s04", "Ayesha Noor", "عائشہ نور", "nur", "p4"),
        ("s05", "Bilal Ahmed", "بلال احمد", "pra", "p3"),
        ("s06", "Zara Raza", "زارا رضا", "pra", "p1"),   # sibling of Ali
        ("s07", "Usman Chaudhry", "عثمان چوہدری", "pra", "p6"),
        ("s08", "Hira Sheikh", "حرا شیخ", "pra", "p4"),
        ("s09", "Fatima Khan", "فاطمہ خان", "prb", "p5"),
        ("s10", "Omar Malik", "عمر ملک", "prb", "p2"),   # sibling of Sara
        ("s11", "Mariam Iqbal", "مریم اقبال", "prb", "p6"),
        ("s12", "Zain Hassan", "زین حسن", "prb", "p5"),  # sibling of Fatima
    ]

    students = {}
    for key, name, name_ur, cls_key, parent_key in student_spec:
        s = Student(
            id=uuid.uuid4(), school_id=school.id, class_id=classes[cls_key].id,
            name=name, name_ur=name_ur,
        )
        db.add(s)
        students[key] = s
        db.flush()
        db.add(
            Guardianship(
                id=uuid.uuid4(), student_id=s.id, user_id=parents[parent_key].id,
                relation="parent", is_primary=True, can_delegate=True,
            )
        )
    db.flush()

    # Ahmed Khan collects six children from FOUR different families across all
    # three classes. This is the case the original data model could not express.
    van_grants = [
        ("s01", "p1"), ("s06", "p1"),   # Raza siblings
        ("s02", "p2"), ("s10", "p2"),   # Malik siblings
        ("s08", "p4"),
        ("s12", "p5"),
    ]
    for s_key, p_key in van_grants:
        db.add(
            PickupAuthorization(
                id=uuid.uuid4(), student_id=students[s_key].id,
                collector_user_id=d1.id, granted_by_user_id=parents[p_key].id,
                kind=AuthorizationKind.standing, valid_from=TODAY - timedelta(days=200),
            )
        )

    for s_key, p_key in [("s03", "p3"), ("s11", "p6")]:
        db.add(
            PickupAuthorization(
                id=uuid.uuid4(), student_id=students[s_key].id,
                collector_user_id=d2.id, granted_by_user_id=parents[p_key].id,
                kind=AuthorizationKind.standing, valid_from=TODAY - timedelta(days=180),
            )
        )

    # Relative, added directly by the parent.
    db.add(
        PickupAuthorization(
            id=uuid.uuid4(), student_id=students["s04"].id,
            collector_user_id=granny.id, granted_by_user_id=parents["p4"].id,
            kind=AuthorizationKind.standing, valid_from=TODAY - timedelta(days=90),
        )
    )
    # One-time pass — same table, expiring today.
    db.add(
        PickupAuthorization(
            id=uuid.uuid4(), student_id=students["s05"].id,
            collector_user_id=granny.id, granted_by_user_id=parents["p3"].id,
            kind=AuthorizationKind.one_time, valid_from=TODAY, valid_until=TODAY,
        )
    )
    # Revoked — proves revocation is per-family, not global: Ahmed keeps the
    # other six children.
    db.add(
        PickupAuthorization(
            id=uuid.uuid4(), student_id=students["s07"].id,
            collector_user_id=d1.id, granted_by_user_id=parents["p6"].id,
            kind=AuthorizationKind.standing, valid_from=TODAY - timedelta(days=200),
            revoked_at=at("09:12"),
        )
    )
    db.flush()

    # Weekly schedule. Van Mon–Thu, parent on Friday — the per-weekday
    # collector column expressing exactly that.
    collector_for_student = {
        "s01": d1, "s02": d1, "s06": d1, "s08": d1, "s10": d1, "s12": d1,
        "s03": d2, "s11": d2,
        "s04": parents["p4"], "s05": parents["p3"],
        "s07": parents["p6"], "s09": parents["p5"],
    }
    parent_of_student = {k: parents[p] for k, _, _, _, p in student_spec}

    for s_key, student in students.items():
        weekday_collector = collector_for_student[s_key]
        for weekday in range(5):
            chosen = weekday_collector if weekday < 4 else parent_of_student[s_key]
            db.add(
                Schedule(
                    id=uuid.uuid4(), student_id=student.id, collector_id=chosen.id,
                    weekday=weekday, pickup_time=time(13, 15),
                )
            )
    db.flush()

    # Today's trips and requests, mid-dismissal.
    trip_van = Trip(
        id=uuid.uuid4(), collector_user_id=d1.id, date=TODAY,
        started_at=at("12:58"), last_lat=33.6901, last_lng=73.0512,
        eta_seconds=95, entered_geofence_at=at("13:06"),
    )
    trip_d2 = Trip(
        id=uuid.uuid4(), collector_user_id=d2.id, date=TODAY,
        started_at=at("13:01"), last_lat=33.6990, last_lng=73.0602, eta_seconds=340,
    )
    trip_p4 = Trip(
        id=uuid.uuid4(), collector_user_id=parents["p4"].id, date=TODAY,
        started_at=at("12:55"), last_lat=33.6846, last_lng=73.0481,
        eta_seconds=0, entered_geofence_at=at("13:02"), arrived_at=at("13:05"),
    )
    trip_granny = Trip(
        id=uuid.uuid4(), collector_user_id=granny.id, date=TODAY,
        started_at=at("12:50"), eta_seconds=0, arrived_at=at("13:07"),
    )
    db.add_all([trip_van, trip_d2, trip_p4, trip_granny])
    db.flush()

    request_spec = [
        ("s01", d1, trip_van, PickupStatus.NEARBY, RequestSource.default),
        ("s02", d1, trip_van, PickupStatus.NEARBY, RequestSource.default),
        ("s06", d1, trip_van, PickupStatus.NEARBY, RequestSource.default),
        ("s08", d1, trip_van, PickupStatus.NEARBY, RequestSource.default),
        ("s10", d1, trip_van, PickupStatus.NEARBY, RequestSource.default),
        ("s12", d1, trip_van, PickupStatus.NEARBY, RequestSource.default),
        ("s03", d2, trip_d2, PickupStatus.EN_ROUTE, RequestSource.default),
        ("s11", d2, trip_d2, PickupStatus.EN_ROUTE, RequestSource.default),
        ("s04", parents["p4"], trip_p4, PickupStatus.AT_GATE, RequestSource.default),
        ("s05", granny, trip_granny, PickupStatus.HANDED_OVER, RequestSource.exception),
        ("s09", parents["p5"], None, PickupStatus.SCHEDULED, RequestSource.default),
        ("s07", parents["p6"], None, PickupStatus.LAPSED, RequestSource.default),
    ]

    requests = {}
    for s_key, collector, trip, status, source in request_spec:
        r = PickupRequest(
            id=uuid.uuid4(), student_id=students[s_key].id, collector_id=collector.id,
            trip_id=trip.id if trip else None, date=TODAY,
            scheduled_time=time(13, 15), status=status, source=source,
        )
        db.add(r)
        requests[s_key] = r
    db.flush()

    # One completed handover, via MANUAL fallback — flagged for review.
    db.add(
        Handover(
            id=uuid.uuid4(), pickup_request_id=requests["s05"].id,
            verified_by_user_id=guard.id, collector_user_id=granny.id,
            method=HandoverMethod.manual, fallback_reason=FallbackReason.no_app,
            verified_at=at("13:08"), device_id="GUARD-TAB-01",
        )
    )

    # Classroom displays. Prep B is offline on purpose — a silent classroom
    # has no other symptom, which is what module M6.5 exists to surface.
    for key, ident, last_seen in [
        ("nur", "TAB-NUR-01", at("13:04")),
        ("pra", "TAB-PRA-01", at("13:04")),
        ("prb", "TAB-PRB-01", at("12:41")),
    ]:
        db.add(
            ClassroomDevice(
                id=uuid.uuid4(), school_id=school.id, class_id=classes[key].id,
                device_identifier=ident, paired_at=at("08:00"), last_seen_at=last_seen,
            )
        )

    # Name clips. Deliberately incomplete so the "missing clip" path is visible.
    for s_key in list(students)[:9]:
        db.add(
            NameAudio(
                id=uuid.uuid4(), subject_type=AudioSubject.student,
                subject_id=students[s_key].id,
                audio_url=f"/audio/students/{students[s_key].id}.mp3",
                duration_ms=random.randint(850, 1250),
            )
        )
    for u in (d1, d2, parents["p4"], granny):
        db.add(
            NameAudio(
                id=uuid.uuid4(), subject_type=AudioSubject.user, subject_id=u.id,
                audio_url=f"/audio/users/{u.id}.mp3",
                duration_ms=random.randint(900, 1300),
            )
        )

    db.add(
        SpokenAnnouncement(
            id=uuid.uuid4(), class_id=classes["nur"].id, trip_id=trip_van.id,
            student_ids=[str(students["s01"].id), str(students["s02"].id)],
            eta_seconds=95, spoken_at=at("13:07"), played_ok=True,
            created_at=at("13:07"),
        )
    )

    db.add_all(
        [
            Announcement(
                id=uuid.uuid4(), school_id=school.id,
                title_en="Early dismissal Friday", title_ur="جمعہ کو جلد چھٹی",
                body_en="School will close at 11:30 AM this Friday for staff training.",
                body_ur="عملے کی تربیت کے باعث اس جمعہ اسکول صبح ۱۱:۳۰ بجے بند ہو جائے گا۔",
                sent_at=at("08:00"), audience=Audience.all,
            ),
            Announcement(
                id=uuid.uuid4(), school_id=school.id,
                title_en="Prep B parent meeting", title_ur="پریپ بی والدین میٹنگ",
                body_en="Prep B parent-teacher meeting is on Wednesday at 2 PM.",
                body_ur="پریپ بی والدین اساتذہ میٹنگ بدھ کو دوپہر ۲ بجے ہے۔",
                sent_at=None, audience=Audience.class_, class_id=classes["prb"].id,
            ),
        ]
    )

    db.add_all(
        [
            AuditLog(
                id=uuid.uuid4(), school_id=school.id, actor_user_id=guard.id,
                action="handover.manual", entity_type="handover",
                entity_id=requests["s05"].id,
                payload={"reason": "no_app", "student": "Bilal Ahmed",
                         "collector": "Rukhsana Bibi"},
                flagged=True, created_at=at("13:08"),
            ),
            AuditLog(
                id=uuid.uuid4(), school_id=school.id, actor_user_id=parents["p6"].id,
                action="authorization.revoke", entity_type="pickup_authorization",
                entity_id=students["s07"].id,
                payload={"student": "Usman Chaudhry", "collector": "Ahmed Khan"},
                flagged=False, created_at=at("09:12"),
            ),
            AuditLog(
                id=uuid.uuid4(), school_id=school.id, actor_user_id=admin.id,
                action="driver.register", entity_type="vehicle", entity_id=None,
                payload={"registration_no": "ICT-8834", "driver": "Yousaf Gul"},
                flagged=False, created_at=at("08:30"),
            ),
        ]
    )

    db.commit()

    user_count = len(db.execute(select(User)).scalars().all())

    print(
        f"""
Seeded Rukhsat demo data
  school      1  ({school.name})
  classes     {len(classes)}  each with a teacher assigned
  students    {len(students)}  including 3 sibling groups
  users       {user_count}
  drivers     2  (Ahmed Khan carries 6 children from 4 families, 3 classes)
  requests    {len(requests)}  covering every queue state
  devices     3  (Prep B deliberately offline)
  handovers   1  manual, flagged for review
  ES256 key   generated and stored on the school

  Every account signs in with password: {DEMO_PASSWORD}
    admin    +923001112233
    teacher  +923004445566
    guard    +923007778899
    parent   +923331000001   (Tariq Raza — two children, van Mon-Thu)
    driver   +923215000011   (Ahmed Khan)
"""
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the Rukhsat demo dataset.")
    parser.add_argument(
        "--reset", action="store_true",
        help="Delete existing demo data first. Without this, rerunning duplicates rows.",
    )
    args = parser.parse_args()

    with SessionLocal() as db:
        existing = db.execute(select(School)).scalars().first()
        if existing and not args.reset:
            print(
                "Data already present. Rerun with --reset to wipe and reseed.\n"
                "(The original script silently duplicated rows here.)"
            )
            return
        if args.reset:
            reset(db)
        seed(db)


if __name__ == "__main__":
    main()
