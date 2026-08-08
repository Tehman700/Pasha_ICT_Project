/**
 * API types.
 *
 * Mirrors `docs/api/openapi.yaml`. The contract is the source of truth — if a
 * shape here disagrees with the YAML, the YAML wins and this file is the bug.
 *
 * Types marked "M0.3 addition" do not exist in the contract yet; they cover
 * the collector and voice-announcement work agreed after the original spec was
 * written. Adding them to `openapi.yaml` is module M0.3.
 */

export type Uuid = string;
export type IsoDate = string; // YYYY-MM-DD
export type IsoDateTime = string;
export type TimeOfDay = string; // "13:15"
export type Locale = "en" | "ur";

/** `driver` is an M0.3 addition — a driver is a collector, never a guardian. */
export type Role = "parent" | "teacher" | "guard" | "admin" | "driver";

export type PickupStatus =
  | "SCHEDULED"
  | "EN_ROUTE"
  | "NEARBY"
  | "AT_GATE"
  | "HANDED_OVER"
  | "CANCELLED"
  | "LAPSED";

export type HandoverMethod = "qr" | "manual";

export type FallbackReason = "phone_dead" | "no_app" | "scan_failed" | "other";

// ── Core entities ──────────────────────────────────────────────────────

export interface School {
  id: Uuid;
  name: string;
  lat: number;
  lng: number;
  geofence_radius_m: number;
  dismissal_time: TimeOfDay;
  timezone: string;
}

export interface User {
  id: Uuid;
  school_id: Uuid;
  role: Role;
  name: string;
  name_ur?: string | null;
  phone: string;
  locale: Locale;
  photo_url?: string | null;
}

export interface ClassRoom {
  id: Uuid;
  school_id: Uuid;
  name: string;
  teacher_id: Uuid | null;
  teacher_name?: string | null;
  student_count?: number;
}

export interface Student {
  id: Uuid;
  school_id: Uuid;
  class_id: Uuid;
  class_name?: string;
  name: string;
  name_ur?: string | null;
  photo_url?: string | null;
}

export interface Guardianship {
  id: Uuid;
  student_id: Uuid;
  user_id: Uuid;
  relation: string;
  is_primary: boolean;
  can_delegate: boolean;
}

export interface Schedule {
  id: Uuid;
  student_id: Uuid;
  /** Renamed from `guardian_id` — the scheduled collector may be a driver. */
  collector_id: Uuid;
  weekday: number; // 0 = Monday
  pickup_time: TimeOfDay;
}

export interface PickupRequest {
  id: Uuid;
  student_id: Uuid;
  student_name?: string;
  collector_id: Uuid;
  collector_name?: string;
  class_id?: Uuid;
  date: IsoDate;
  scheduled_time: TimeOfDay;
  status: PickupStatus;
  source: "default" | "exception";
  trip_id: Uuid | null;
}

export interface Trip {
  id: Uuid;
  /** Renamed from `guardian_id`. One trip covers every child this collector fetches today. */
  collector_user_id: Uuid;
  date: IsoDate;
  started_at: IsoDateTime;
  last_lat: number | null;
  last_lng: number | null;
  eta_seconds: number | null;
  entered_geofence_at: IsoDateTime | null;
  arrived_at: IsoDateTime | null;
}

export interface QueueEntry {
  pickup_request_id: Uuid;
  trip_id: Uuid | null;
  student_id: Uuid;
  student_name: string;
  class_id: Uuid;
  class_name: string;
  collector_name: string;
  collector_role: Role;
  status: PickupStatus;
  eta_seconds: number | null;
  position: number;
  /**
   * Every child on the same trip. A van driver is one queue entry carrying
   * many children, in the same lane as everyone else — there is no van lane.
   */
  sibling_group: { student_id: Uuid; student_name: string; class_name: string }[];
}

export interface Handover {
  id?: Uuid;
  pickup_request_id: Uuid;
  student_name?: string;
  collector_name?: string;
  verified_by_user_id?: Uuid;
  verified_by_name?: string;
  method: HandoverMethod;
  qr_token?: string | null;
  fallback_reason?: FallbackReason | null;
  device_id: string;
  verified_at?: IsoDateTime;
}

/**
 * The result of scanning a code.
 *
 * `valid` is about the signature and the clock. `authorized` is per child and
 * is a separate question — a token minted before a parent revoked access is
 * still cryptographically perfect, so the signature is necessary and not
 * sufficient.
 */
export interface ScanResult {
  valid: boolean;
  /** Present when refused. The guard app branches on this. */
  code?: "malformed" | "expired" | "bad_signature" | "already_used" | "not_yet_valid" | "wrong_school";
  message?: string;
  jti?: string;
  collector?: {
    id: Uuid;
    name: string;
    name_ur?: string | null;
    photo_url: string | null;
    role: Role;
  } | null;
  children?: {
    pickup_request_id: Uuid;
    student_id: Uuid;
    student_name: string;
    student_photo_url: string | null;
    status: PickupStatus;
    authorized: boolean;
    reason: string | null;
  }[];
  confirm_visually?: string;
}

export interface QrTokenBatchItem {
  token: string;
  exp: IsoDateTime;
}

export interface Announcement {
  id: Uuid;
  school_id: Uuid;
  title_en: string;
  title_ur: string;
  body_en: string;
  body_ur: string;
  sent_at: IsoDateTime | null;
  audience: "all" | "class" | "single";
}

export interface AuditLogEntry {
  id: Uuid;
  school_id: Uuid;
  actor_user_id: Uuid | null;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: Uuid | null;
  payload: Record<string, unknown>;
  created_at: IsoDateTime;
  /** Manual handovers surface flagged for admin review. */
  flagged: boolean;
}

// ── M0.3 additions: collectors ─────────────────────────────────────────

export type AuthorizationKind = "standing" | "one_time";

/**
 * Who may collect whom.
 *
 * Replaces the original `delegate_passes` table. A one-time pass is now just
 * `kind: "one_time"` with an expiry, so the Tier 2 delegate-pass feature falls
 * out of the same model instead of needing its own build.
 */
export interface PickupAuthorization {
  id: Uuid;
  student_id: Uuid;
  student_name?: string;
  collector_user_id: Uuid;
  collector_name?: string;
  collector_role?: Role;
  /** The parent who granted this. Revocation is per-family. */
  granted_by_user_id: Uuid;
  granted_by_name?: string;
  kind: AuthorizationKind;
  valid_from: IsoDate;
  valid_until: IsoDate | null;
  revoked_at: IsoDateTime | null;
}

/**
 * What a parent sees before linking a driver.
 *
 * The school has vetted nobody, so the photos are the verification and the
 * parent is the verifier. There is deliberately no automated face match — she
 * knows what the man she hired looks like.
 */
export interface CollectorLookup {
  id: Uuid;
  name: string;
  name_ur?: string | null;
  phone: string;
  selfie_url: string | null;
  id_photo_url: string | null;
  cnic_last4: string | null;
  vehicle: {
    registration_no: string;
    capacity: number;
    photo_url: string | null;
    expected_arrival: string | null;
  } | null;
  /** How many families already link him. Context, not an endorsement. */
  linked_families: number;
  verify_yourself: string;
}

export interface Vehicle {
  id: Uuid;
  school_id: Uuid;
  driver_user_id: Uuid;
  driver_name?: string;
  registration_no: string;
  capacity: number;
  photo_url?: string | null;
  /** Children currently authorized to this driver, across all families. */
  authorized_student_count?: number;
}

// ── M0.3 additions: voice announcements ────────────────────────────────

export interface ClassroomDevice {
  id: Uuid;
  school_id: Uuid;
  class_id: Uuid;
  class_name?: string;
  device_identifier: string;
  paired_at: IsoDateTime;
  last_seen_at: IsoDateTime | null;
  /** Derived from `last_seen_at`. A silent classroom must be visible to admin. */
  online: boolean;
}

export type AudioSubjectType = "student" | "user";

export interface NameAudio {
  id: Uuid;
  subject_type: AudioSubjectType;
  subject_id: Uuid;
  subject_name?: string;
  audio_url: string;
  duration_ms: number;
}

export interface SpokenAnnouncement {
  id: Uuid;
  class_id: Uuid;
  trip_id: Uuid;
  collector_name: string;
  students: { student_id: Uuid; student_name: string }[];
  eta_seconds: number;
  spoken_at: IsoDateTime | null;
  played_ok: boolean;
}

// ── Auth ───────────────────────────────────────────────────────────────

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  expires_in: number;
  user: User;
}

// ── Self-registration ──────────────────────────────────────────────────
//
// Two paths, deliberately asymmetric. A parent is matched to children the
// school already enrolled, by CNIC. A driver is matched to nobody: he lands in
// the database linked to nothing and stays invisible until a parent picks him.
// See `docs/SECURITY.md` — the school vets nobody, so liability sits with the
// parent who granted access.

export interface ParentRegistration {
  name: string;
  name_ur?: string | null;
  phone: string;
  password: string;
  /** 13 digits. The match key — see `ParentRegistrationResult.matched_children`. */
  cnic: string;
  selfie_url?: string | null;
  id_photo_url?: string | null;
  school_id: Uuid;
  locale?: string;
}

export interface ParentRegistrationResult {
  user: User;
  /**
   * The children this CNIC matched. **An empty array is a normal outcome**,
   * not an error: the school may hold the other parent's CNIC, and the fix is
   * a phone call rather than a looser match. The screen must say so plainly
   * instead of implying the account failed.
   */
  matched_children: { id: Uuid; name: string; class_id: Uuid }[];
  message: string;
}

export interface DriverRegistration {
  name: string;
  name_ur?: string | null;
  phone: string;
  password: string;
  cnic: string;
  /**
   * **Required by the server**, and camera-only in the app — a gallery upload
   * can be any face off the internet, and the parent linking him is the one
   * who will look at it. This is the highest-privilege actor in the system,
   * so registering without a face is not an option the API offers.
   */
  selfie_url: string;
  /** Required. His CNIC card, photographed. */
  id_photo_url: string;
  registration_no: string;
  capacity?: number | null;
  vehicle_photo_url?: string | null;
  /** `HH:MM`. The schedule backbone — see the geofence note in `CLAUDE.md`. */
  expected_arrival?: string | null;
  school_id: Uuid;
}

export interface DriverRegistrationResult {
  user: User;
  /** Always `UNASSIGNED` at registration. Derived server-side, never stored. */
  status: "UNASSIGNED" | "ASSIGNED";
  message: string;
}

// ── Analytics ──────────────────────────────────────────────────────────

export interface WaitTimeStats {
  average_wait_seconds: number;
  median_wait_seconds: number;
  by_day: { date: IsoDate; average_wait_seconds: number }[];
  peak_minutes: { minute: string; count: number }[];
}

export interface OnTimeStats {
  on_time_rate: number;
  total_pickups: number;
  manual_fallback_rate: number;
}

// ── Errors ─────────────────────────────────────────────────────────────

export interface ApiErrorBody {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
