"""Schools, classes, students, guardianships, users, vehicles."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, require_admin, require_guard, require_staff
from app.models import (
    Guardianship,
    PickupAuthorization,
    Role,
    School,
    SchoolClass,
    Student,
    User,
    Vehicle,
)
from app.schemas import (
    ClassOut,
    GuardianshipOut,
    SchoolOut,
    StudentOut,
    UserOut,
    VehicleOut,
)
from app.security import hash_password
from app.services.authorization import may_view_student

router = APIRouter()


# ── schools ────────────────────────────────────────────────────────────


@router.get("/schools", response_model=list[SchoolOut], tags=["schools"])
def list_schools(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Scoped to the caller's school. The previous contract claimed this
    # returned User[], which is what happens when a spec is never exercised.
    rows = db.execute(select(School).where(School.id == user.school_id)).scalars().all()
    return [SchoolOut.model_validate(r) for r in rows]


@router.get("/schools/public", response_model=list[SchoolOut], tags=["schools"])
def list_schools_public(db: Session = Depends(get_db)):
    """
    Schools a person can register against. **Deliberately unauthenticated.**

    Self-registration needs a `school_id` before an account exists, so the
    authenticated `/schools` above cannot serve it — that endpoint scopes to
    the caller's own school and a registering user has none.

    Nothing here is sensitive: a school's name and gate coordinates are
    public facts, printed on the gate and findable on any map. No rosters, no
    staff, no children — those all stay behind `get_current_user`.
    """
    rows = db.execute(select(School).order_by(School.name)).scalars().all()
    return [SchoolOut.model_validate(r) for r in rows]


@router.get(
    "/schools/{school_id}/public-key",
    tags=["qr"],
    response_class=PlainTextResponse,
)
def school_public_key(
    school_id: uuid.UUID, db: Session = Depends(get_db)
) -> PlainTextResponse:
    """
    Public by design: it verifies signatures, it cannot create them. The guard
    app caches this once a day so scans verify with no network.
    """
    school = db.get(School, school_id)
    if school is None or not school.public_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No public key for this school")
    return PlainTextResponse(school.public_key)


@router.get("/schools/{school_id}/drivers", tags=["collectors"])
def school_drivers(
    school_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Drivers currently serving this school.

    NOT an approved list — the school approves nobody. A driver appears here
    only because a parent linked him to a child, and disappears when the last
    such link is revoked. He may serve three schools; each sees him only
    through their own students.

    Derived from live authorizations rather than a stored flag, because a
    stored flag drifts: revoke the last link and a stale ASSIGNED would leave
    him visible to a school he no longer serves.
    """
    linked_driver_ids = (
        select(PickupAuthorization.collector_user_id)
        .join(Student, Student.id == PickupAuthorization.student_id)
        .where(
            Student.school_id == school_id,
            PickupAuthorization.revoked_at.is_(None),
        )
        .scalar_subquery()
    )
    rows = db.execute(
        select(User, Vehicle)
        .join(Vehicle, Vehicle.driver_user_id == User.id)
        .where(
            User.role == Role.driver,
            User.id.in_(linked_driver_ids),
        )
    ).all()
    return [
        {
            "driver": UserOut.model_validate(u),
            "vehicle": VehicleOut.model_validate(v),
        }
        for u, v in rows
    ]


# ── classes ────────────────────────────────────────────────────────────


@router.get("/classes", response_model=list[ClassOut], tags=["classes"])
def list_classes(
    school_id: uuid.UUID | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(SchoolClass).where(SchoolClass.school_id == (school_id or user.school_id))
    ).scalars().all()
    return [ClassOut.model_validate(r) for r in rows]


# ── students ───────────────────────────────────────────────────────────


@router.get("/students", response_model=list[StudentOut], tags=["students"])
def list_students(
    class_id: uuid.UUID | None = None,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_staff),
    db: Session = Depends(get_db),
):
    stmt = select(Student).where(Student.school_id == user.school_id)
    if class_id:
        stmt = stmt.where(Student.class_id == class_id)
    rows = db.execute(stmt.order_by(Student.name).limit(limit).offset(offset)).scalars().all()
    return [StudentOut.model_validate(r) for r in rows]


@router.get("/students/search", response_model=list[StudentOut], tags=["students"])
def search_students(
    q: str = Query(min_length=1),
    user: User = Depends(require_guard),
    db: Session = Depends(get_db),
):
    """
    The guard's manual-fallback lookup — guards and admins only.

    A search endpoint IS the leak: even a zero-result query confirms whether a
    child attends the school. Collectors must never reach this, which is why
    the role guard is on the route rather than a filter inside it.
    """
    rows = db.execute(
        select(Student)
        .where(Student.school_id == user.school_id, Student.name.ilike(f"%{q}%"))
        .order_by(Student.name)
        .limit(25)
    ).scalars().all()
    return [StudentOut.model_validate(r) for r in rows]


@router.get(
    "/students/{student_id}/guardians",
    response_model=list[GuardianshipOut],
    tags=["guardianships"],
)
def student_guardians(
    student_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not may_view_student(db, viewer=user, student_id=student_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted for this child")
    rows = db.execute(
        select(Guardianship).where(Guardianship.student_id == student_id)
    ).scalars().all()
    return [GuardianshipOut.model_validate(r) for r in rows]


# ── users ──────────────────────────────────────────────────────────────


@router.get("/users", response_model=list[UserOut], tags=["auth"])
def list_users(
    role: Role | None = None,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    stmt = select(User).where(User.school_id == admin.school_id)
    if role:
        stmt = stmt.where(User.role == role)
    rows = db.execute(stmt.order_by(User.name).limit(limit).offset(offset)).scalars().all()
    return [UserOut.model_validate(r) for r in rows]


@router.post(
    "/users", response_model=UserOut, status_code=status.HTTP_201_CREATED, tags=["auth"]
)
def create_user(
    body: dict,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    required = {"role", "name", "phone", "password"}
    missing = required - set(body)
    if missing:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, f"Missing: {', '.join(sorted(missing))}"
        )
    if db.execute(select(User).where(User.phone == body["phone"])).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Phone number already registered")

    u = User(
        id=uuid.uuid4(),
        school_id=admin.school_id,
        role=Role(body["role"]),
        name=body["name"],
        name_ur=body.get("name_ur"),
        phone=body["phone"],
        password_hash=hash_password(body["password"]),
        locale=body.get("locale", "en"),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return UserOut.model_validate(u)


# ── vehicles ───────────────────────────────────────────────────────────


@router.get("/vehicles", response_model=list[VehicleOut], tags=["collectors"])
def list_vehicles(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if user.role == Role.driver:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted")
    rows = db.execute(
        select(Vehicle).where(Vehicle.school_id == user.school_id)
    ).scalars().all()
    return [VehicleOut.model_validate(r) for r in rows]
