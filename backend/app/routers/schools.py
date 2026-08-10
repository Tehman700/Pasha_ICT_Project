"""
School onboarding.

Until now schools existed only because a seed script created one. That was
fine while the only deployment was ours, but it means a real school has no way
in — and it left `users.school_id` with nothing to point at for a brand new
administrator.

Two things this module is careful about.

**Admin and school are created together, in one transaction.**
`users.school_id` is NOT NULL, so an administrator cannot exist before their
school does. Rather than make the column nullable — a schema change that would
weaken a constraint the whole authorization model leans on — signup takes both
halves at once. The web UI collects them on two screens and submits once, so
it still *feels* like "register, then set up your school".

**A new school gets its own ES256 keypair immediately.**
Every QR code is signed with the school's private key and verified by guards
against its public key. A school created without one would look completely
healthy right up until the first parent showed a code at the gate and it could
not be verified — a failure that surfaces days later, at the worst moment, far
from its cause. So the keypair is generated here, not lazily.

The geofence radius is the administrator's to choose. A campus on a main road
needs a wider ring than one down a lane, and only the school knows which it is.
"""

from __future__ import annotations

import uuid
from datetime import time as Time

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db, utcnow
from app.deps import get_current_user
from app.models import AuditLog, Role, School, User
from app.schemas import UserOut
from app.security import create_access_token, hash_password

router = APIRouter()

#: Sanity bounds on the geofence. Below ~100 m the ring is inside the building
#: and a collector at the gate never enters it; above 20 km it covers a whole
#: city and stops meaning "nearly here". Both ends are a misconfiguration that
#: would look like the feature simply not working.
MIN_RADIUS_M = 100
MAX_RADIUS_M = 20_000


def generate_es256_keypair() -> tuple[str, str]:
    """(private_pem, public_pem) for signing this school's QR codes."""
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


def parse_hhmm(raw: str, field: str) -> Time:
    try:
        h, m = (int(x) for x in raw.split(":")[:2])
        return Time(h, m)
    except (ValueError, TypeError):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, f"{field} must be HH:MM"
        ) from None


class SchoolDetails(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    geofence_radius_m: int = Field(default=1000, ge=MIN_RADIUS_M, le=MAX_RADIUS_M)
    #: Local time the school lets out, e.g. "13:15".
    dismissal_time: str = "13:15"
    timezone: str = "Asia/Karachi"

    @field_validator("name")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()


class AdminSignup(BaseModel):
    """One request, two records — see the module docstring for why."""

    name: str = Field(min_length=2, max_length=200)
    name_ur: str | None = None
    phone: str = Field(min_length=6, max_length=32)
    password: str = Field(min_length=8, max_length=128)
    locale: str = "en"
    school: SchoolDetails


class SchoolUpdate(BaseModel):
    """Every field optional — this is a PATCH."""

    name: str | None = Field(default=None, min_length=2, max_length=200)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    geofence_radius_m: int | None = Field(default=None, ge=MIN_RADIUS_M, le=MAX_RADIUS_M)
    dismissal_time: str | None = None


def school_out(s: School) -> dict:
    return {
        "id": str(s.id),
        "name": s.name,
        "lat": s.lat,
        "lng": s.lng,
        "geofence_radius_m": s.geofence_radius_m,
        "dismissal_time": s.dismissal_time.strftime("%H:%M"),
        "timezone": s.timezone,
    }


@router.post("/auth/register-admin", status_code=status.HTTP_201_CREATED, tags=["auth"])
def register_admin(body: AdminSignup, db: Session = Depends(get_db)):
    """
    Register a school and its first administrator, together.

    Returns a token as well as the records, so the browser can go straight to
    the dashboard instead of bouncing the person back to a login form they
    filled in thirty seconds ago.
    """
    if db.execute(select(User).where(User.phone == body.phone)).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Phone number already registered")

    dismissal = parse_hhmm(body.school.dismissal_time, "dismissal_time")
    private_pem, public_pem = generate_es256_keypair()

    school = School(
        id=uuid.uuid4(),
        name=body.school.name,
        lat=body.school.lat,
        lng=body.school.lng,
        geofence_radius_m=body.school.geofence_radius_m,
        dismissal_time=dismissal,
        timezone=body.school.timezone,
        public_key=public_pem,
        private_key_enc=private_pem,
    )
    db.add(school)
    db.flush()

    admin = User(
        id=uuid.uuid4(),
        school_id=school.id,
        role=Role.admin,
        name=body.name,
        name_ur=body.name_ur,
        phone=body.phone,
        password_hash=hash_password(body.password),
        locale=body.locale if body.locale in ("en", "ur") else "en",
    )
    db.add(admin)
    db.flush()

    db.add(
        AuditLog(
            id=uuid.uuid4(),
            school_id=school.id,
            actor_user_id=admin.id,
            action="school.registered",
            entity_type="school",
            entity_id=school.id,
            payload={
                "school": school.name,
                "radius_m": school.geofence_radius_m,
                "lat": school.lat,
                "lng": school.lng,
            },
            flagged=False,
            created_at=utcnow(),
        )
    )
    db.commit()
    db.refresh(admin)
    db.refresh(school)

    token, expires_in = create_access_token(
        subject=str(admin.id), role=admin.role.value, school_id=str(admin.school_id)
    )
    return {
        "access_token": token,
        "expires_in": expires_in,
        "user": UserOut.model_validate(admin).model_dump(mode="json"),
        "school": school_out(school),
    }


@router.patch("/schools/{school_id}", tags=["schools"])
def update_school(
    school_id: uuid.UUID,
    body: SchoolUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Move the school or resize its geofence.

    Scoped to the caller's own school and to admins. A teacher who could move
    the geofence could silently stop every arrival announcement in the
    building, which is a far bigger lever than the screen would suggest.
    """
    if user.role != Role.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Administrators only")
    if user.school_id != school_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your school")

    school = db.get(School, school_id)
    if school is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such school")

    changed: dict[str, object] = {}
    if body.name is not None:
        school.name = body.name.strip()
        changed["name"] = school.name
    # `lat` and `lng` move together or not at all — half a coordinate pair is a
    # point in the sea, and the geofence would silently stop matching anyone.
    if (body.lat is None) != (body.lng is None):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "lat and lng must be given together"
        )
    if body.lat is not None and body.lng is not None:
        school.lat, school.lng = body.lat, body.lng
        changed["lat"], changed["lng"] = body.lat, body.lng
    if body.geofence_radius_m is not None:
        school.geofence_radius_m = body.geofence_radius_m
        changed["geofence_radius_m"] = body.geofence_radius_m
    if body.dismissal_time is not None:
        school.dismissal_time = parse_hhmm(body.dismissal_time, "dismissal_time")
        changed["dismissal_time"] = body.dismissal_time

    if changed:
        db.add(
            AuditLog(
                id=uuid.uuid4(),
                school_id=school.id,
                actor_user_id=user.id,
                action="school.updated",
                entity_type="school",
                entity_id=school.id,
                payload=changed,
                flagged=False,
                created_at=utcnow(),
            )
        )
    db.commit()
    db.refresh(school)
    return school_out(school)
