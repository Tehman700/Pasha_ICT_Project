"""
Self-registration for collectors.

A driver is a **private commercial contract between a parent and a driver.**
The school is not party to it, does not vet it, and should not carry the
liability of having "approved" anyone. So:

  driver self-registers  ->  UNASSIGNED, linked to nothing, visible to nobody
  a parent links him     ->  ASSIGNED, and only then visible to that school,
                             and only for that parent's children

Consequences that follow from this and matter:

  - The admin sees a driver only through the children he is linked to. He may
    work three schools; each sees his row only for their own students.
  - Liability sits with the parent. Asked who approved this man, the answer is
    "the parent did, on this date, here is the log" — not "the school did".

Status is DERIVED from live authorizations rather than stored. A stored flag
drifts: revoke the last authorization and a stale ASSIGNED leaves a driver
visible to a school he no longer serves.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db, utcnow
from app.deps import get_current_user
from app.models import (
    AuditLog,
    Guardianship,
    PickupAuthorization,
    Role,
    School,
    Student,
    User,
    Vehicle,
)
from app.schemas import UserOut
from app.security import hash_password

router = APIRouter()


def normalise_cnic(raw: str) -> str:
    """CNICs are written 12345-1234567-1 or 1234512345671. Store digits only."""
    return "".join(ch for ch in raw if ch.isdigit())


def phone_candidates(raw: str) -> list[str]:
    """
    Every form a phone number might plausibly arrive in.

    Two things bite here. First, `+` in a query string decodes to a SPACE, so
    `?phone=+923001234567` reaches the handler as ` 923001234567` — a silent
    404 for a number that exists. Second, people type the same Pakistani
    number four ways: +923001234567, 03001234567, 3001234567, with spaces or
    dashes.

    Rather than demand the caller get it right, try the reasonable forms.
    """
    cleaned = raw.strip().replace(" ", "").replace("-", "")
    if not cleaned:
        return []

    out = [cleaned]
    digits = "".join(ch for ch in cleaned if ch.isdigit())

    if not cleaned.startswith("+"):
        out.append("+" + digits)
    if digits.startswith("0"):
        out.append("+92" + digits[1:])
    elif digits.startswith("92"):
        out.append("0" + digits[2:])

    # Preserve order, drop duplicates.
    return list(dict.fromkeys(out))


class DriverRegistration(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    name_ur: str | None = None
    phone: str = Field(min_length=5, max_length=32)
    password: str = Field(min_length=8, max_length=256)
    cnic: str = Field(min_length=13, max_length=20)
    #: Camera-only in the app. A gallery upload can be any image off the
    #: internet, and the parent is the one who will look at it.
    selfie_url: str
    id_photo_url: str
    registration_no: str = Field(min_length=3, max_length=32)
    vehicle_photo_url: str | None = None
    capacity: int = Field(default=12, ge=1, le=40)
    #: His own declared arrival time — the backbone of arrival detection.
    expected_arrival: str | None = None
    school_id: uuid.UUID


class ParentRegistration(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    name_ur: str | None = None
    phone: str = Field(min_length=5, max_length=32)
    password: str = Field(min_length=8, max_length=256)
    cnic: str = Field(min_length=13, max_length=20)
    selfie_url: str | None = None
    id_photo_url: str | None = None
    school_id: uuid.UUID
    locale: str = "en"


@router.post(
    "/auth/register/driver",
    status_code=status.HTTP_201_CREATED,
    tags=["auth"],
)
def register_driver(body: DriverRegistration, db: Session = Depends(get_db)):
    """
    A driver registers himself. No admin queue, no school involvement.

    He lands in the database linked to nothing and visible to nobody until a
    parent chooses him.
    """
    if db.get(School, body.school_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such school")
    if db.execute(select(User).where(User.phone == body.phone)).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Phone number already registered")

    from datetime import time as Time

    arrival = None
    if body.expected_arrival:
        try:
            h, m = (int(x) for x in body.expected_arrival.split(":")[:2])
            arrival = Time(h, m)
        except ValueError:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, "expected_arrival must be HH:MM"
            ) from None

    driver = User(
        id=uuid.uuid4(),
        school_id=body.school_id,
        role=Role.driver,
        name=body.name,
        name_ur=body.name_ur,
        phone=body.phone,
        password_hash=hash_password(body.password),
        locale="ur",
        cnic=normalise_cnic(body.cnic),
        id_photo_url=body.id_photo_url,
        selfie_url=body.selfie_url,
        photo_url=body.selfie_url,
    )
    db.add(driver)
    db.flush()

    db.add(
        Vehicle(
            id=uuid.uuid4(),
            school_id=body.school_id,
            driver_user_id=driver.id,
            registration_no=body.registration_no,
            capacity=body.capacity,
            photo_url=body.vehicle_photo_url,
            expected_arrival=arrival,
        )
    )
    db.commit()
    db.refresh(driver)

    return {
        "user": UserOut.model_validate(driver).model_dump(mode="json"),
        # Derived, not stored — see the module docstring.
        "status": "UNASSIGNED",
        "message": "Registered. A parent must link you before you appear to a school.",
    }


@router.post("/auth/register/parent", status_code=status.HTTP_201_CREATED, tags=["auth"])
def register_parent(body: ParentRegistration, db: Session = Depends(get_db)):
    """
    A parent registers and is matched to their children by CNIC.

    Matching on name fails both ways. "Muhammad Aslam Khan" / "M. Aslam" is one
    man as three strings — a false negative, merely annoying. Two "Muhammad
    Ali" guardians in a 300-student school is a FALSE POSITIVE that hands one
    man another man's children. That second failure is why this is not a close
    call, and why an unmatched parent phones the school rather than being
    matched loosely.
    """
    if db.get(School, body.school_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such school")
    if db.execute(select(User).where(User.phone == body.phone)).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Phone number already registered")

    cnic = normalise_cnic(body.cnic)

    parent = User(
        id=uuid.uuid4(),
        school_id=body.school_id,
        role=Role.parent,
        name=body.name,
        name_ur=body.name_ur,
        phone=body.phone,
        password_hash=hash_password(body.password),
        locale=body.locale,
        cnic=cnic,
        id_photo_url=body.id_photo_url,
        selfie_url=body.selfie_url,
        photo_url=body.selfie_url,
    )
    db.add(parent)
    db.flush()

    children = db.execute(
        select(Student).where(
            Student.school_id == body.school_id, Student.guardian_cnic == cnic
        )
    ).scalars().all()

    for child in children:
        db.add(
            Guardianship(
                id=uuid.uuid4(),
                student_id=child.id,
                user_id=parent.id,
                relation="parent",
                is_primary=True,
                can_delegate=True,
            )
        )

    db.add(
        AuditLog(
            id=uuid.uuid4(),
            school_id=body.school_id,
            actor_user_id=parent.id,
            action="parent.self_register",
            entity_type="user",
            entity_id=parent.id,
            payload={"matched_children": len(children), "cnic_last4": cnic[-4:]},
            # An unmatched parent needs a human, so surface it.
            flagged=len(children) == 0,
            created_at=utcnow(),
        )
    )
    db.commit()
    db.refresh(parent)

    return {
        "user": UserOut.model_validate(parent).model_dump(mode="json"),
        "matched_children": [
            {"id": str(c.id), "name": c.name, "class_id": str(c.class_id)}
            for c in children
        ],
        "message": (
            "We found your children — please confirm."
            if children
            else "No match. Please phone the school and they will link your account."
        ),
    }


@router.get("/collectors/lookup", tags=["collectors"])
def lookup_collector(
    phone: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    A parent looks up a driver by phone before linking him.

    Returns the photos so SHE decides. There is no automated face match: she
    knows what the man she hired looks like, and an algorithm that says "82%"
    is worse than a parent looking at a picture. If the photos look wrong, she
    does not link him.

    Deliberately requires the exact phone number. It is a lookup, not a search
    — you cannot browse drivers, only confirm one you already know.
    """
    if user.role == Role.driver:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted")

    candidates = phone_candidates(phone)
    target = None
    if candidates:
        target = db.execute(
            select(User).where(User.phone.in_(candidates))
        ).scalars().first()
    if target is None or target.role != Role.driver:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No driver with that number")

    vehicle = db.execute(
        select(Vehicle).where(Vehicle.driver_user_id == target.id)
    ).scalar_one_or_none()

    # How many families already trust him. Not an endorsement — context.
    families = db.execute(
        select(PickupAuthorization.granted_by_user_id).where(
            PickupAuthorization.collector_user_id == target.id,
            PickupAuthorization.revoked_at.is_(None),
        )
    ).scalars().all()

    return {
        "id": str(target.id),
        "name": target.name,
        "name_ur": target.name_ur,
        "phone": target.phone,
        "selfie_url": target.selfie_url,
        "id_photo_url": target.id_photo_url,
        "cnic_last4": target.cnic[-4:] if target.cnic else None,
        "vehicle": (
            {
                "registration_no": vehicle.registration_no,
                "capacity": vehicle.capacity,
                "photo_url": vehicle.photo_url,
                "expected_arrival": (
                    vehicle.expected_arrival.strftime("%H:%M")
                    if vehicle.expected_arrival
                    else None
                ),
            }
            if vehicle
            else None
        ),
        "linked_families": len(set(families)),
        "verify_yourself": (
            "Check the photo against the person you hired. The school has not "
            "vetted this driver — you are the one granting access."
        ),
    }
