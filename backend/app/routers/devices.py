"""
Classroom displays: pairing, and the recorded name clips they speak.

A display is a cheap Android tablet or an old phone plugged into the school's
existing PA amplifier. We are not installing a PA system — every school gate in
Pakistan already has one, and every teacher already responds to it. Same
information, different last mile.

Announcements stitch pre-recorded clips rather than using device TTS. Android's
Urdu TTS is unreliable on cheap hardware, and an English voice mangles Pakistani
names — "Muhammad Hamza Chaudhry" read by an en-US engine is not a name anyone
recognises. One clip per person covers BOTH languages, because a name sounds
the same either way; only the surrounding template phrases are recorded twice.
"""

from __future__ import annotations

import secrets
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db, utcnow
from app.deps import get_current_user, require_admin
from app.models import (
    AudioSubject,
    ClassroomDevice,
    Guardianship,
    NameAudio,
    SchoolClass,
    Student,
    User,
)

router = APIRouter()

MEDIA_ROOT = Path("media")
AUDIO_DIR = MEDIA_ROOT / "name-audio"

#: Ambiguous characters removed. Someone reads this off a dashboard and types
#: it into a tablet across the room, so O/0, I/1 and L/1 all go — they cost
#: more support calls than the extra entropy is worth. 31 characters over 6
#: positions is still ~887 million combinations, ample for a code that is
#: single-use and burned on redemption.
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

MAX_AUDIO_BYTES = 2 * 1024 * 1024
ALLOWED_AUDIO = {"audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/wav", "audio/x-m4a"}


def _pairing_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))


class CreateDevice(BaseModel):
    class_id: uuid.UUID


@router.post("/devices", status_code=status.HTTP_201_CREATED, tags=["devices"])
def create_device(
    body: CreateDevice,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin registers a display for a class and gets a pairing code to type in."""
    klass = db.get(SchoolClass, body.class_id)
    if klass is None or klass.school_id != admin.school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such class")

    code = _pairing_code()
    device = ClassroomDevice(
        id=uuid.uuid4(),
        school_id=admin.school_id,
        class_id=body.class_id,
        # Placeholder until the tablet claims it — the device supplies its own
        # identifier when pairing.
        device_identifier=f"unpaired-{code}",
        pairing_code=code,
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    return {
        "id": str(device.id),
        "class_id": str(device.class_id),
        "class_name": klass.name,
        "pairing_code": code,
        "instructions": "Open the display URL on the tablet and enter this code.",
    }


class PairRequest(BaseModel):
    pairing_code: str
    device_identifier: str


@router.post("/devices/classroom/pair", tags=["devices"])
def pair_device(body: PairRequest, db: Session = Depends(get_db)):
    """
    A tablet claims its class using the code from the dashboard.

    Unauthenticated on purpose: the tablet has no user and nobody is going to
    log a display in every morning. The code is the credential — single use,
    cleared on redemption, and it grants exactly one thing: the right to
    receive announcements for one class. It reads no student records.
    """
    code = body.pairing_code.strip().upper()
    device = db.execute(
        select(ClassroomDevice).where(ClassroomDevice.pairing_code == code)
    ).scalar_one_or_none()

    if device is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That pairing code is not valid")

    klass = db.get(SchoolClass, device.class_id)

    # A tablet moved from one classroom to another re-pairs with the same
    # identifier. That column is globally unique, so without releasing the old
    # row first this fails with an integrity error and the display simply never
    # pairs — with nothing on screen explaining why.
    previous = db.execute(
        select(ClassroomDevice).where(
            ClassroomDevice.device_identifier == body.device_identifier,
            ClassroomDevice.id != device.id,
        )
    ).scalar_one_or_none()
    if previous is not None:
        previous.device_identifier = f"released-{previous.id}"
        previous.paired_at = None
        previous.last_seen_at = None
        db.flush()

    device.device_identifier = body.device_identifier
    device.paired_at = utcnow()
    device.last_seen_at = utcnow()
    # Burned on use, so a code written on a whiteboard cannot pair a second
    # tablet later.
    device.pairing_code = None
    db.commit()
    db.refresh(device)

    return {
        "id": str(device.id),
        "class_id": str(device.class_id),
        "class_name": klass.name if klass else None,
        "paired_at": device.paired_at.isoformat(),
    }


@router.get("/classes/{class_id}/audio-manifest", tags=["devices"])
def audio_manifest(
    class_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Clips this display caches for the day.

    Cached ahead of time so an announcement does not wait on a download at the
    moment it needs to play — the network is worst exactly when the gate is
    busiest.
    """
    students = db.execute(
        select(Student).where(Student.class_id == class_id)
    ).scalars().all()
    student_ids = [s.id for s in students]

    collector_ids = list(
        db.execute(
            select(Guardianship.user_id).where(Guardianship.student_id.in_(student_ids))
        ).scalars().all()
    ) if student_ids else []

    subject_ids = student_ids + collector_ids
    clips = (
        db.execute(select(NameAudio).where(NameAudio.subject_id.in_(subject_ids)))
        .scalars()
        .all()
        if subject_ids
        else []
    )

    by_subject = {str(c.subject_id): c for c in clips}
    missing = [s.name for s in students if str(s.id) not in by_subject]

    return {
        "class_id": str(class_id),
        "clips": [
            {
                "subject_type": c.subject_type.value,
                "subject_id": str(c.subject_id),
                "audio_url": c.audio_url,
                "duration_ms": c.duration_ms,
            }
            for c in clips
        ],
        # The display falls back to class + count when a name has no clip,
        # rather than going silent or mispronouncing it.
        "missing_names": missing,
        "template_phrases": {
            "ur": ["/audio/phrases/ur/arriving_for.mp3", "/audio/phrases/ur/in_two_minutes.mp3"],
            "en": ["/audio/phrases/en/arriving_for.mp3", "/audio/phrases/en/in_two_minutes.mp3"],
        },
    }


def _store_clip(
    db: Session,
    *,
    subject_type: AudioSubject,
    subject_id: uuid.UUID,
    upload: UploadFile,
) -> NameAudio:
    if upload.content_type not in ALLOWED_AUDIO:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Expected an audio file, got {upload.content_type}",
        )

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(upload.filename or "clip.m4a").suffix or ".m4a"
    path = AUDIO_DIR / f"{subject_id}{suffix}"

    size = 0
    with path.open("wb") as out:
        while chunk := upload.file.read(64 * 1024):
            size += len(chunk)
            if size > MAX_AUDIO_BYTES:
                out.close()
                path.unlink(missing_ok=True)
                raise HTTPException(
                    status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    "A name clip should be a couple of seconds, not a recording session",
                )
            out.write(chunk)

    existing = db.execute(
        select(NameAudio).where(
            NameAudio.subject_type == subject_type, NameAudio.subject_id == subject_id
        )
    ).scalar_one_or_none()

    # Re-recording replaces rather than accumulates — a second clip for the
    # same person would make the announcement non-deterministic.
    if existing is not None:
        existing.audio_url = f"/media/name-audio/{path.name}"
        existing.duration_ms = 0
        db.commit()
        db.refresh(existing)
        return existing

    clip = NameAudio(
        id=uuid.uuid4(),
        subject_type=subject_type,
        subject_id=subject_id,
        audio_url=f"/media/name-audio/{path.name}",
        duration_ms=0,
    )
    db.add(clip)
    db.commit()
    db.refresh(clip)
    return clip


@router.post(
    "/students/{student_id}/name-audio",
    status_code=status.HTTP_201_CREATED,
    tags=["devices"],
)
def upload_student_audio(
    student_id: uuid.UUID,
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    student = db.get(Student, student_id)
    if student is None or student.school_id != admin.school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such student")
    clip = _store_clip(
        db, subject_type=AudioSubject.student, subject_id=student_id, upload=file
    )
    return {"id": str(clip.id), "audio_url": clip.audio_url, "name": student.name}


@router.post(
    "/users/{user_id}/name-audio",
    status_code=status.HTTP_201_CREATED,
    tags=["devices"],
)
def upload_user_audio(
    user_id: uuid.UUID,
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if target is None or target.school_id != admin.school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such user")
    clip = _store_clip(
        db, subject_type=AudioSubject.user, subject_id=user_id, upload=file
    )
    return {"id": str(clip.id), "audio_url": clip.audio_url, "name": target.name}
