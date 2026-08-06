"""
Pydantic request/response models.

These must match `docs/api/openapi.yaml` and `packages/shared/src/types/api.ts`.
All three describe the same contract; if they disagree the YAML wins and the
other two are bugs.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field

from app.models import (
    AuthorizationKind,
    FallbackReason,
    HandoverMethod,
    PickupStatus,
    RequestSource,
    Role,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Errors ─────────────────────────────────────────────────────────────


class ApiError(BaseModel):
    """The original contract documented no error shape at all."""

    status: int
    code: str
    message: str
    details: dict | None = None


# ── Auth ───────────────────────────────────────────────────────────────


class LoginRequest(BaseModel):
    phone: str = Field(min_length=5, max_length=32)
    password: str = Field(min_length=1, max_length=256)


class UserOut(ORMModel):
    id: uuid.UUID
    school_id: uuid.UUID
    role: Role
    name: str
    name_ur: str | None = None
    phone: str
    locale: str
    photo_url: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    # The original contract omitted this, so no client could know when to refresh.
    expires_in: int
    user: UserOut


class UpdateMeRequest(BaseModel):
    """
    `users.fcm_token` existed in the schema with no endpoint able to set it,
    which meant push notifications could never work at all.
    """

    fcm_token: str | None = None
    locale: str | None = Field(default=None, pattern="^(en|ur)$")


# ── People ─────────────────────────────────────────────────────────────


class SchoolOut(ORMModel):
    id: uuid.UUID
    name: str
    lat: float
    lng: float
    geofence_radius_m: int
    dismissal_time: time
    timezone: str


class ClassOut(ORMModel):
    id: uuid.UUID
    school_id: uuid.UUID
    name: str
    teacher_id: uuid.UUID | None = None


class StudentOut(ORMModel):
    id: uuid.UUID
    school_id: uuid.UUID
    class_id: uuid.UUID
    name: str
    name_ur: str | None = None
    photo_url: str | None = None


class GuardianshipOut(ORMModel):
    id: uuid.UUID
    student_id: uuid.UUID
    user_id: uuid.UUID
    relation: str
    is_primary: bool
    can_delegate: bool


class VehicleOut(ORMModel):
    id: uuid.UUID
    school_id: uuid.UUID
    driver_user_id: uuid.UUID
    registration_no: str
    capacity: int
    photo_url: str | None = None


# ── Collectors ─────────────────────────────────────────────────────────


class AuthorizationOut(ORMModel):
    id: uuid.UUID
    student_id: uuid.UUID
    collector_user_id: uuid.UUID
    granted_by_user_id: uuid.UUID
    kind: AuthorizationKind
    valid_from: date
    valid_until: date | None = None
    revoked_at: datetime | None = None


class CreateAuthorizationRequest(BaseModel):
    collector_user_id: uuid.UUID
    kind: AuthorizationKind = AuthorizationKind.standing
    valid_from: date | None = None
    valid_until: date | None = None


# ── Scheduling ─────────────────────────────────────────────────────────


class ScheduleOut(ORMModel):
    id: uuid.UUID
    student_id: uuid.UUID
    collector_id: uuid.UUID
    weekday: int = Field(ge=0, le=6)
    pickup_time: time


class PickupRequestOut(ORMModel):
    id: uuid.UUID
    student_id: uuid.UUID
    collector_id: uuid.UUID
    trip_id: uuid.UUID | None = None
    date: date
    scheduled_time: time
    status: PickupStatus
    source: RequestSource


class TripOut(ORMModel):
    id: uuid.UUID
    collector_user_id: uuid.UUID
    date: date
    started_at: datetime
    last_lat: float | None = None
    last_lng: float | None = None
    eta_seconds: int | None = None
    entered_geofence_at: datetime | None = None
    arrived_at: datetime | None = None


class LocationPing(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


# ── Handover ───────────────────────────────────────────────────────────


class HandoverIn(BaseModel):
    pickup_request_id: uuid.UUID
    method: HandoverMethod
    device_id: str
    qr_token: str | None = None
    fallback_reason: FallbackReason | None = None
    # Sent when syncing a handover confirmed while offline.
    verified_at: datetime | None = None


class HandoverOut(ORMModel):
    id: uuid.UUID
    pickup_request_id: uuid.UUID
    verified_by_user_id: uuid.UUID
    collector_user_id: uuid.UUID
    method: HandoverMethod
    fallback_reason: FallbackReason | None = None
    verified_at: datetime
    device_id: str


# ── Health ─────────────────────────────────────────────────────────────


class HealthOut(BaseModel):
    status: str
    database: str
    redis: str
    environment: str
