"""
Seed script — populates a demo dataset: 1 school, 3 classes, 30 students,
40 guardians, matching docs/DATA_MODEL.md.

Adjust DATABASE_URL below (or wire it to app.config.settings once that
module exists). Assumes the tables in docs/DATA_MODEL.md already exist
via Alembic migration. Safe to rerun for a fresh demo dataset — it does
NOT clear existing data first, so drop and recreate the DB (or truncate
manually) if you want a clean slate rather than accumulating rows.

Run from backend/ with the venv active:
    python ../scripts/seed.py
"""

import random
import uuid

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

DATABASE_URL = "postgresql://pickup_app:CHANGE_ME@<ec2-host>:5432/pickup"

FIRST_NAMES = [
    "Ali", "Sara", "Hamza", "Ayesha", "Bilal", "Zara", "Usman", "Hira",
    "Ahmed", "Fatima", "Omar", "Mariam", "Hassan", "Amna", "Zain", "Noor",
]
LAST_NAMES = ["Khan", "Malik", "Ahmed", "Raza", "Iqbal", "Sheikh", "Butt", "Chaudhry"]


def random_name() -> str:
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def random_phone() -> str:
    return f"+92300{random.randint(1000000, 9999999)}"


def seed(session: Session) -> None:
    school_id = uuid.uuid4()
    session.execute(
        text(
            """
            INSERT INTO schools (id, name, lat, lng, geofence_radius_m, dismissal_time, timezone)
            VALUES (:id, :name, :lat, :lng, :radius, :dismissal, :tz)
            """
        ),
        {
            "id": str(school_id),
            "name": "Demo Montessori School",
            "lat": 33.6844,  # Islamabad — adjust to your actual pilot school
            "lng": 73.0479,
            "radius": 1000,
            "dismissal": "13:15",
            "tz": "Asia/Karachi",
        },
    )

    class_names = ["Nursery", "Prep A", "Prep B"]
    class_ids = []
    for class_name in class_names:
        class_id = uuid.uuid4()
        class_ids.append(class_id)
        session.execute(
            text("INSERT INTO classes (id, school_id, name) VALUES (:id, :sid, :name)"),
            {"id": str(class_id), "sid": str(school_id), "name": class_name},
        )

    guardian_ids = []
    for _ in range(40):
        gid = uuid.uuid4()
        guardian_ids.append(gid)
        session.execute(
            text(
                """
                INSERT INTO users (id, school_id, role, name, phone, locale)
                VALUES (:id, :sid, 'parent', :name, :phone, :locale)
                """
            ),
            {
                "id": str(gid),
                "sid": str(school_id),
                "name": random_name(),
                "phone": random_phone(),
                "locale": random.choice(["en", "ur"]),
            },
        )

    student_ids = []
    for _ in range(30):
        sid = uuid.uuid4()
        student_ids.append(sid)
        class_id = random.choice(class_ids)
        session.execute(
            text(
                "INSERT INTO students (id, school_id, class_id, name) "
                "VALUES (:id, :sch, :cls, :name)"
            ),
            {"id": str(sid), "sch": str(school_id), "cls": str(class_id), "name": random_name()},
        )

        # Link 1–2 guardians per student, each with a default Mon–Fri schedule
        for gid in random.sample(guardian_ids, k=random.choice([1, 2])):
            session.execute(
                text(
                    """
                    INSERT INTO guardianships (id, student_id, user_id, relation, is_primary, can_delegate)
                    VALUES (:id, :sid, :gid, 'parent', true, true)
                    """
                ),
                {"id": str(uuid.uuid4()), "sid": str(sid), "gid": str(gid)},
            )
            for weekday in range(0, 5):  # Mon–Fri
                session.execute(
                    text(
                        """
                        INSERT INTO schedules (id, student_id, guardian_id, weekday, pickup_time)
                        VALUES (:id, :sid, :gid, :wd, :time)
                        """
                    ),
                    {
                        "id": str(uuid.uuid4()),
                        "sid": str(sid),
                        "gid": str(gid),
                        "wd": weekday,
                        "time": "13:15",
                    },
                )

    # One teacher per class
    for class_id, class_name in zip(class_ids, class_names):
        session.execute(
            text(
                """
                INSERT INTO users (id, school_id, role, name, phone, locale)
                VALUES (:id, :sid, 'teacher', :name, :phone, 'en')
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "sid": str(school_id),
                "name": f"{class_name} Teacher",
                "phone": random_phone(),
            },
        )

    # One guard for the whole school
    session.execute(
        text(
            """
            INSERT INTO users (id, school_id, role, name, phone, locale)
            VALUES (:id, :sid, 'guard', 'Main Gate Guard', :phone, 'ur')
            """
        ),
        {"id": str(uuid.uuid4()), "sid": str(school_id), "phone": random_phone()},
    )

    session.commit()
    print(
        f"Seeded: 1 school, {len(class_ids)} classes, "
        f"{len(student_ids)} students, {len(guardian_ids)} guardians"
    )


if __name__ == "__main__":
    engine = create_engine(DATABASE_URL)
    with Session(engine) as session:
        seed(session)
