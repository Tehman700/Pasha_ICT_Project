"""
Database schema.

Source of truth is `docs/DATA_MODEL.md` — if these diverge, both change in the
same commit.

Three renames versus the original doc, all because a driver is a collector but
is not a guardian of anyone:

    trips.guardian_id            -> trips.collector_user_id
    schedules.guardian_id        -> schedules.collector_id
    pickup_requests.guardian_id  -> pickup_requests.collector_id

Five tables are new: pickup_authorizations, vehicles, classroom_devices,
name_audio, spoken_announcements.
"""

from __future__ import annotations

import enum
import uuid
from datetime import date as Date
from datetime import datetime, time
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date as SADate,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, TimestampMixin


def _pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


# ── Enums ──────────────────────────────────────────────────────────────


class Role(str, enum.Enum):
    parent = "parent"
    teacher = "teacher"
    guard = "guard"
    admin = "admin"
    # A driver collects children from many families. Not a guardian of any.
    driver = "driver"


class PickupStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    EN_ROUTE = "EN_ROUTE"
    NEARBY = "NEARBY"
    AT_GATE = "AT_GATE"
    HANDED_OVER = "HANDED_OVER"
    CANCELLED = "CANCELLED"
    LAPSED = "LAPSED"


class RequestSource(str, enum.Enum):
    default = "default"
    exception = "exception"


class HandoverMethod(str, enum.Enum):
    qr = "qr"
    manual = "manual"


class FallbackReason(str, enum.Enum):
    phone_dead = "phone_dead"
    no_app = "no_app"
    scan_failed = "scan_failed"
    other = "other"


class AuthorizationKind(str, enum.Enum):
    standing = "standing"
    one_time = "one_time"


class AudioSubject(str, enum.Enum):
    student = "student"
    user = "user"


class Audience(str, enum.Enum):
    all = "all"
    class_ = "class"
    single = "single"


# ── Core ───────────────────────────────────────────────────────────────


class School(Base, TimestampMixin):
    __tablename__ = "schools"

    id: Mapped[uuid.UUID] = _pk()
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    geofence_radius_m: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    dismissal_time: Mapped[time] = mapped_column(Time, nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Karachi", nullable=False)

    # ES256 keypair for QR signing. The private key never leaves the server and
    # is stored encrypted; the guard app only ever receives the public key.
    public_key: Mapped[Optional[str]] = mapped_column(Text)
    private_key_enc: Mapped[Optional[str]] = mapped_column(Text)

    users: Mapped[list[User]] = relationship(back_populates="school")
    classes: Mapped[list[SchoolClass]] = relationship(back_populates="school")


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _pk()
    school_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[Role] = mapped_column(SAEnum(Role, name="role"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_ur: Mapped[Optional[str]] = mapped_column(String(200))
    phone: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    locale: Mapped[str] = mapped_column(String(2), default="en", nullable=False)
    photo_url: Mapped[Optional[str]] = mapped_column(Text)
    # Nothing could set this in the original contract, so push could never work.
    fcm_token: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    school: Mapped[School] = relationship(back_populates="users")

    __table_args__ = (Index("ix_users_school_role", "school_id", "role"),)


class SchoolClass(Base, TimestampMixin):
    __tablename__ = "classes"

    id: Mapped[uuid.UUID] = _pk()
    school_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    teacher_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    school: Mapped[School] = relationship(back_populates="classes")
    students: Mapped[list[Student]] = relationship(back_populates="school_class")


class Student(Base, TimestampMixin):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = _pk()
    school_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    class_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("classes.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    name_ur: Mapped[Optional[str]] = mapped_column(String(200))
    photo_url: Mapped[Optional[str]] = mapped_column(Text)

    school_class: Mapped[SchoolClass] = relationship(back_populates="students")

    __table_args__ = (Index("ix_students_class", "class_id"),)


class Guardianship(Base, TimestampMixin):
    """Parent/guardian ↔ student. Sibling grouping falls out of this."""

    __tablename__ = "guardianships"

    id: Mapped[uuid.UUID] = _pk()
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    relation: Mapped[str] = mapped_column(String(50), default="parent", nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Only a guardian with this may authorize someone else to collect.
    can_delegate: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "user_id", name="uq_guardianship"),
        Index("ix_guardianships_user", "user_id"),
    )


# ── Collectors (new) ───────────────────────────────────────────────────


class PickupAuthorization(Base, TimestampMixin):
    """
    Who may collect whom.

    Replaces the original `delegate_passes` table. A one-time pass is simply
    `kind = one_time` with an expiry, so the Tier 2 delegate-pass feature comes
    out of the same model instead of needing a separate build.

    Revocation is per-family: one parent revoking a driver has no effect on any
    other family's authorization of that same driver.
    """

    __tablename__ = "pickup_authorizations"

    id: Mapped[uuid.UUID] = _pk()
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    collector_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    granted_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    kind: Mapped[AuthorizationKind] = mapped_column(
        SAEnum(AuthorizationKind, name="authorization_kind"),
        default=AuthorizationKind.standing,
        nullable=False,
    )
    valid_from: Mapped[Date] = mapped_column(SADate, nullable=False)
    valid_until: Mapped[Optional[Date]] = mapped_column(SADate)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        # The authorization check runs on every handover — index it.
        Index("ix_auth_student_collector", "student_id", "collector_user_id"),
        Index("ix_auth_collector", "collector_user_id"),
    )


class Vehicle(Base, TimestampMixin):
    """A school-registered van. Vetted by the school, then chosen by parents."""

    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = _pk()
    school_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    driver_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    registration_no: Mapped[str] = mapped_column(String(32), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    photo_url: Mapped[Optional[str]] = mapped_column(Text)

    __table_args__ = (
        UniqueConstraint("school_id", "registration_no", name="uq_vehicle_reg"),
    )


# ── Scheduling ─────────────────────────────────────────────────────────


class Schedule(Base, TimestampMixin):
    """
    Recurring weekly default. Set once; a nightly job generates each day's
    pickup_request.

    `collector_id` is per weekday, which gives "van Monday–Thursday, father
    Friday" with no extra structure.
    """

    __tablename__ = "schedules"

    id: Mapped[uuid.UUID] = _pk()
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    collector_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)  # 0 = Monday
    pickup_time: Mapped[time] = mapped_column(Time, nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "weekday", name="uq_schedule_student_weekday"),
    )


class Trip(Base, TimestampMixin):
    """
    One trip covers every child this collector fetches today.

    For a parent that is their own children (sibling grouping). For a driver it
    spans many families and often several classes. The trip only completes when
    every linked request is HANDED_OVER.
    """

    __tablename__ = "trips"

    id: Mapped[uuid.UUID] = _pk()
    collector_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[Date] = mapped_column(SADate, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_lat: Mapped[Optional[float]] = mapped_column(Float)
    last_lng: Mapped[Optional[float]] = mapped_column(Float)
    eta_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    entered_geofence_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    arrived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        # One active trip per collector per day.
        UniqueConstraint("collector_user_id", "date", name="uq_trip_collector_date"),
    )


class PickupRequest(Base, TimestampMixin):
    __tablename__ = "pickup_requests"

    id: Mapped[uuid.UUID] = _pk()
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    collector_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    trip_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("trips.id", ondelete="SET NULL")
    )
    date: Mapped[Date] = mapped_column(SADate, nullable=False)
    scheduled_time: Mapped[time] = mapped_column(Time, nullable=False)
    status: Mapped[PickupStatus] = mapped_column(
        SAEnum(PickupStatus, name="pickup_status"),
        default=PickupStatus.SCHEDULED,
        nullable=False,
    )
    source: Mapped[RequestSource] = mapped_column(
        SAEnum(RequestSource, name="request_source"),
        default=RequestSource.default,
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("student_id", "date", name="uq_request_student_date"),
        # The teacher's daily list runs this query constantly.
        Index("ix_requests_date_student", "date", "student_id"),
        Index("ix_requests_trip", "trip_id"),
    )


# ── Handover & audit ───────────────────────────────────────────────────


class Handover(Base, TimestampMixin):
    __tablename__ = "handovers"

    id: Mapped[uuid.UUID] = _pk()
    pickup_request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pickup_requests.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    verified_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    collector_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    method: Mapped[HandoverMethod] = mapped_column(
        SAEnum(HandoverMethod, name="handover_method"), nullable=False
    )
    fallback_reason: Mapped[Optional[FallbackReason]] = mapped_column(
        SAEnum(FallbackReason, name="fallback_reason")
    )
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    device_id: Mapped[str] = mapped_column(String(128), nullable=False)
    # The jti of the QR token, so an offline batch sync is idempotent and a
    # token cannot be replayed on a second device.
    qr_jti: Mapped[Optional[str]] = mapped_column(String(64), unique=True)

    __table_args__ = (Index("ix_handovers_request", "pickup_request_id"),)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = _pk()
    school_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    actor_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    # Manual handovers surface flagged for school review.
    flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    __table_args__ = (
        # The admin log is always filtered and sorted this way.
        Index("ix_audit_school_created", "school_id", "created_at"),
    )


# ── Voice announcements (new) ──────────────────────────────────────────


class ClassroomDevice(Base, TimestampMixin):
    """
    A wall-mounted tablet bound to one class.

    Announcements have no offline path — the ETA trigger is computed
    server-side and pushed. `last_seen_at` is the only way a silent classroom
    becomes visible.
    """

    __tablename__ = "classroom_devices"

    id: Mapped[uuid.UUID] = _pk()
    school_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    class_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    device_identifier: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    pairing_code: Mapped[Optional[str]] = mapped_column(String(12))
    paired_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class NameAudio(Base, TimestampMixin):
    """
    One recorded clip per person.

    The same clip serves both languages — a name sounds the same either way.
    Only the surrounding template phrases are recorded twice.
    """

    __tablename__ = "name_audio"

    id: Mapped[uuid.UUID] = _pk()
    subject_type: Mapped[AudioSubject] = mapped_column(
        SAEnum(AudioSubject, name="audio_subject"), nullable=False
    )
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    audio_url: Mapped[str] = mapped_column(Text, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("subject_type", "subject_id", name="uq_name_audio_subject"),
    )


class SpokenAnnouncement(Base):
    """
    One row per announcement played in one classroom.

    Batched: every child of one trip in one class becomes a single
    announcement. Without that, thirty arrivals over a 90-minute dismissal
    means an announcement every ~30 seconds in every room.
    """

    __tablename__ = "spoken_announcements"

    id: Mapped[uuid.UUID] = _pk()
    class_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
    )
    student_ids: Mapped[dict] = mapped_column(JSONB, default=list, nullable=False)
    eta_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    spoken_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    played_ok: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        # A trip announces once per class, never twice.
        UniqueConstraint("class_id", "trip_id", name="uq_announcement_class_trip"),
    )


# ── Announcements (school broadcast) ───────────────────────────────────


class Announcement(Base, TimestampMixin):
    __tablename__ = "announcements"

    id: Mapped[uuid.UUID] = _pk()
    school_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    # Both languages in the same record. There is no "translate later" path —
    # that would show a parent who reads only Urdu an empty message.
    title_en: Mapped[str] = mapped_column(String(200), nullable=False)
    title_ur: Mapped[str] = mapped_column(String(200), nullable=False)
    body_en: Mapped[str] = mapped_column(Text, nullable=False)
    body_ur: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    audience: Mapped[Audience] = mapped_column(
        SAEnum(Audience, name="audience"), default=Audience.all, nullable=False
    )
    class_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE")
    )
