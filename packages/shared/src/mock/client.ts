/**
 * Typed API client.
 *
 * `PickupApi` is the interface every surface codes against. `mockApi` returns
 * fixtures; the real implementation (module M1.4b) will hit the FastAPI
 * backend behind the same interface. Screens never learn which one they got,
 * so wiring the backend later is a swap at one call site — not a pass over
 * every screen.
 *
 * Keep every method here aligned with `docs/api/openapi.yaml`.
 */

import type {
  AdminSignupRequest,
  AdminSignupResponse,
  SchoolUpdate,
  Announcement,
  AuditLogEntry,
  ClassRoom,
  ClassroomDevice,
  Handover,
  IsoDate,
  Locale,
  LoginRequest,
  LoginResponse,
  NameAudio,
  OnTimeStats,
  PickupAuthorization,
  CollectorLookup,
  PickupRequest,
  QrTokenBatchItem,
  QueueEntry,
  ScanResult,
  Schedule,
  TimeOfDay,
  School,
  Student,
  Trip,
  User,
  Uuid,
  Vehicle,
  WaitTimeStats,
  DriverRegistration,
  DriverRegistrationResult,
  ParentRegistration,
  ParentRegistrationResult,
} from "../types/api";
import * as fx from "./fixtures";

export interface PickupApi {
  login(body: LoginRequest): Promise<LoginResponse>;

  /**
   * Self-registration. Neither call signs the user in: the result screen has
   * something to say first — which children a parent's CNIC matched, or that
   * a driver is registered but invisible until a parent links him.
   */
  registerParent(body: ParentRegistration): Promise<ParentRegistrationResult>;
  registerDriver(body: DriverRegistration): Promise<DriverRegistrationResult>;

  me(): Promise<User>;
  /**
   * Registers the device push token and the language preference.
   *
   * `fcm_token: null` unregisters — used when a user revokes notification
   * permission in Android settings, so the backend stops sending to a device
   * that will never show them.
   */
  updateMe(body: { fcm_token?: string | null; locale?: Locale }): Promise<User>;

  listSchools(): Promise<School[]>;
  /** Unauthenticated — the registration screens run before a token exists. */
  listSchoolsPublic(): Promise<School[]>;
  /**
   * Creates a school AND its first administrator in one transaction, and
   * returns a token. Unauthenticated by nature — there is nobody to
   * authenticate as until it succeeds.
   */
  registerAdmin(body: AdminSignupRequest): Promise<AdminSignupResponse>;
  /** Admin only, own school only. */
  updateSchool(schoolId: Uuid, patch: SchoolUpdate): Promise<School>;
  /** Returns the storage KEY to persist, not a URL. See the http client. */
  uploadPhoto(uri: string, purpose: string): Promise<{ key: string; url: string | null }>;
  listClasses(schoolId?: Uuid): Promise<ClassRoom[]>;
  listStudents(classId?: Uuid): Promise<Student[]>;
  searchStudents(query: string): Promise<Student[]>;
  listUsers(role?: User["role"]): Promise<User[]>;
  /** Admin only. School comes from the token, never the body. */
  createUser(body: {
    role: User["role"];
    name: string;
    name_ur?: string | null;
    phone: string;
    password: string;
  }): Promise<User>;
  createClass(body: { name: string; teacher_id?: Uuid | null }): Promise<ClassRoom>;
  createStudent(body: {
    name: string;
    name_ur?: string | null;
    class_id: Uuid;
    guardian_cnic?: string | null;
  }): Promise<Student>;
  linkGuardian(studentId: Uuid, body: { user_id: Uuid; relation?: string }): Promise<unknown>;

  listVehicles(): Promise<Vehicle[]>;
  /** Look a driver up by exact phone before linking him. Not a search. */
  lookupCollector(phone: string): Promise<CollectorLookup>;
  grantAuthorization(studentId: Uuid, collectorUserId: Uuid): Promise<PickupAuthorization>;
  listAuthorizations(filter?: {
    studentId?: Uuid;
    collectorId?: Uuid;
  }): Promise<PickupAuthorization[]>;
  revokeAuthorization(id: Uuid): Promise<void>;

  listPickupRequests(params?: {
    classId?: Uuid;
    date?: IsoDate;
  }): Promise<PickupRequest[]>;
  getQueue(classId?: Uuid): Promise<QueueEntry[]>;

  listDevices(): Promise<ClassroomDevice[]>;
  listNameAudio(): Promise<NameAudio[]>;

  listHandovers(): Promise<Handover[]>;
  listAuditLog(params?: { flaggedOnly?: boolean }): Promise<AuditLogEntry[]>;
  listAnnouncements(): Promise<Announcement[]>;

  getWaitTimes(): Promise<WaitTimeStats>;
  getOnTimeRate(): Promise<OnTimeStats>;

  // ── Mobile surfaces ──────────────────────────────────────────────────
  /** The signed-in collector's own children (parent) — empty for a driver. */
  getMyChildren(): Promise<Student[]>;
  getMySchedules(): Promise<Schedule[]>;
  setSchedule(body: {
    student_id: Uuid;
    collector_id: Uuid;
    weekday: number;
    pickup_time: TimeOfDay;
    id?: Uuid;
  }): Promise<Schedule>;
  getMyPickupRequests(date?: IsoDate): Promise<PickupRequest[]>;
  /** Collectors this parent has authorized for their own children. */
  getMyCollectors(): Promise<PickupAuthorization[]>;
  /** A driver's cross-family list for today. Parents get their own children. */
  getMyManifest(): Promise<PickupRequest[]>;
  getMyTrip(): Promise<Trip | null>;
  /** Today's pickups for the caller's OWN children, whoever collects them. */
  getMyChildrenPickups(date?: IsoDate): Promise<PickupRequest[]>;
  /** Stream a GPS fix. Returns the recomputed ETA and geofence state. */
  postLocation(
    tripId: Uuid,
    ping: { lat: number; lng: number },
  ): Promise<{
    eta_seconds: number;
    distance_m: number;
    inside_geofence: boolean;
    status: string;
    announced_to: string[];
  }>;
  startTrip(): Promise<Trip>;
  endTrip(tripId: Uuid): Promise<void>;
  /** Pre-signed batch fetched at trip start so the gate works with no signal. */
  getQrTokens(tripId: Uuid, count?: number): Promise<QrTokenBatchItem[]>;
  /** Verify a scanned code. The guard app also does this offline. */
  verifyQrToken(token: string, deviceId: string): Promise<ScanResult>;
  /** This collector's own position in the live queue. */
  getMyQueueEntry(): Promise<QueueEntry | null>;
  /** Teacher's prep list — from bookings, NOT queue order. */
  getPrepList(classId: Uuid): Promise<PickupRequest[]>;
  markStaged(pickupRequestId: Uuid): Promise<void>;
  submitHandover(body: Handover): Promise<void>;
}

/** Simulated network latency, so loading states are real rather than theoretical. */
const LATENCY_MS = 180;

function delay<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const mockApi: PickupApi = {
  async login({ phone }) {
    const user = fx.users.find((u) => u.phone === phone) ?? fx.users[0]!;
    return delay({ access_token: "mock.jwt.token", expires_in: 3600, user });
  },

  async registerParent(body) {
    const user = { ...fx.users.find((u) => u.role === "parent")!, name: body.name };
    // The unmatched case is reachable on fixtures too: a CNIC ending in 0000
    // returns nothing, so the "phone the school" branch can be seen without a
    // backend. That branch is the one most likely to ship untested.
    const matched = body.cnic.replace(/\D/g, "").endsWith("0000")
      ? []
      : fx.students.slice(0, 2).map((s) => ({
          id: s.id,
          name: s.name,
          class_id: s.class_id,
        }));
    return delay({
      user,
      matched_children: matched,
      message: matched.length
        ? "We found your children — please confirm."
        : "No match. Please phone the school and they will link your account.",
    });
  },

  async registerDriver(body) {
    const user = { ...fx.users.find((u) => u.role === "driver")!, name: body.name };
    return delay({
      user,
      status: "UNASSIGNED" as const,
      message: "Registered. A parent must link you before you appear to a school.",
    });
  },

  async me() {
    return delay(fx.users.find((u) => u.role === "admin")!);
  },

  async updateMe(body) {
    const user = fx.users.find((u) => u.role === "admin")!;
    return delay({ ...user, locale: body.locale ?? user.locale });
  },

  async listSchools() {
    return delay([fx.school]);
  },

  async registerAdmin(body: AdminSignupRequest) {
    const school: School = {
      id: "mock-school-" + Date.now(),
      name: body.school.name,
      lat: body.school.lat,
      lng: body.school.lng,
      geofence_radius_m: body.school.geofence_radius_m,
      dismissal_time: body.school.dismissal_time ?? "13:15",
      timezone: body.school.timezone ?? "Asia/Karachi",
    };
    const user: User = {
      ...fx.users.find((u) => u.role === "admin")!,
      id: "mock-admin-" + Date.now(),
      name: body.name,
      phone: body.phone,
      school_id: school.id,
    };
    return delay({ access_token: "mock.jwt.token", expires_in: 3600, user, school });
  },

  async updateSchool(schoolId: Uuid, patch: SchoolUpdate) {
    // Fixtures hold exactly one school, so there is nothing to look up.
    return delay({ ...fx.school, ...patch });
  },

  async listSchoolsPublic() {
    return delay([fx.school]);
  },

  async uploadPhoto(uri) {
    // Echo the local file back: on fixtures the camera preview is the photo,
    // which is enough to exercise the screen without a server.
    return delay({ key: `mock/${Date.now()}.jpg`, url: uri });
  },

  async listClasses(schoolId) {
    return delay(
      schoolId ? fx.classes.filter((c) => c.school_id === schoolId) : fx.classes,
    );
  },

  async listStudents(classId) {
    return delay(
      classId ? fx.students.filter((s) => s.class_id === classId) : fx.students,
    );
  },

  async searchStudents(query) {
    const q = query.trim().toLowerCase();
    if (!q) return delay([], 60);
    return delay(
      fx.students.filter((s) => s.name.toLowerCase().includes(q)),
      120,
    );
  },

  async createUser(body) {
    return delay({ ...fx.users[0]!, id: "mock-" + Date.now(), ...body } as User);
  },
  async createClass(body) {
    return delay({ ...fx.classes[0]!, id: "mock-" + Date.now(), name: body.name });
  },
  async createStudent(body) {
    return delay({ ...fx.students[0]!, id: "mock-" + Date.now(), name: body.name });
  },
  async linkGuardian() {
    return delay({ ok: true });
  },

  async listUsers(role) {
    return delay(role ? fx.users.filter((u) => u.role === role) : fx.users);
  },

  async listVehicles() {
    return delay(fx.vehicles);
  },

  async lookupCollector(phone: string) {
    const driver = fx.users.find((u) => u.phone === phone && u.role === "driver");
    if (!driver) throw new Error("No driver with that number");
    const vehicle = fx.vehicles.find((v) => v.driver_user_id === driver.id);
    return delay({
      id: driver.id,
      name: driver.name,
      name_ur: driver.name_ur ?? null,
      phone: driver.phone,
      selfie_url: null,
      id_photo_url: null,
      cnic_last4: "4567",
      vehicle: vehicle
        ? {
            registration_no: vehicle.registration_no,
            capacity: vehicle.capacity,
            photo_url: null,
            expected_arrival: "13:15",
          }
        : null,
      linked_families: 4,
      verify_yourself:
        "Check the photo against the person you hired. The school has not vetted this driver.",
    });
  },

  async grantAuthorization(studentId: Uuid, collectorUserId: Uuid) {
    return delay({
      id: "auth-new",
      student_id: studentId,
      collector_user_id: collectorUserId,
      granted_by_user_id: fx.currentParent.id,
      kind: "standing" as const,
      valid_from: new Date().toISOString().slice(0, 10),
      valid_until: null,
      revoked_at: null,
    });
  },

  async listAuthorizations(filter) {
    let rows = fx.authorizations;
    if (filter?.studentId) {
      rows = rows.filter((a) => a.student_id === filter.studentId);
    }
    if (filter?.collectorId) {
      rows = rows.filter((a) => a.collector_user_id === filter.collectorId);
    }
    return delay(rows);
  },

  async revokeAuthorization() {
    // Mock layer is read-only; the real client will PATCH and invalidate cache.
    return delay(undefined);
  },

  async listPickupRequests(params) {
    let rows = fx.pickupRequests;
    if (params?.classId) rows = rows.filter((r) => r.class_id === params.classId);
    if (params?.date) rows = rows.filter((r) => r.date === params.date);
    return delay(rows);
  },

  async getQueue(classId) {
    return delay(
      classId ? fx.queue.filter((q) => q.class_id === classId) : fx.queue,
    );
  },

  async listDevices() {
    return delay(fx.devices);
  },

  async listNameAudio() {
    return delay(fx.nameAudio);
  },

  async listHandovers() {
    return delay(fx.handovers);
  },

  async listAuditLog(params) {
    return delay(
      params?.flaggedOnly ? fx.auditLog.filter((l) => l.flagged) : fx.auditLog,
    );
  },

  async listAnnouncements() {
    return delay(fx.announcements);
  },

  async getWaitTimes() {
    return delay(fx.waitTimes);
  },

  async getOnTimeRate() {
    return delay(fx.onTime);
  },

  // ── Mobile surfaces ──────────────────────────────────────────────────

  async getMyChildren() {
    return delay(fx.myChildren);
  },

  async setSchedule(body: {
    student_id: Uuid;
    collector_id: Uuid;
    weekday: number;
    pickup_time: TimeOfDay;
    id?: Uuid;
  }) {
    return delay({ id: body.id ?? "sch-mock", ...body } as Schedule);
  },

  async getMySchedules() {
    return delay(fx.schedules);
  },

  async getMyPickupRequests(date) {
    const mine = fx.pickupRequests.filter((r) =>
      fx.myChildren.some((c) => c.id === r.student_id),
    );
    return delay(date ? mine.filter((r) => r.date === date) : mine);
  },

  async getMyCollectors() {
    return delay(
      fx.authorizations.filter(
        (a) => a.granted_by_user_id === fx.currentParent.id,
      ),
    );
  },

  async getMyManifest() {
    // Driver view: every child this collector fetches today, across families.
    return delay(
      fx.pickupRequests.filter((r) => r.collector_id === fx.currentDriver.id),
    );
  },

  async getMyChildrenPickups() {
    return delay(fx.pickupRequests.slice(0, 2));
  },

  async postLocation() {
    return delay({
      eta_seconds: 95,
      distance_m: 580,
      inside_geofence: true,
      status: "NEARBY",
      announced_to: [],
    });
  },

  async getMyTrip() {
    return delay(fx.myTrip);
  },

  async startTrip() {
    return delay({ ...fx.myTrip, started_at: new Date().toISOString() });
  },

  async endTrip() {
    return delay(undefined);
  },

  async getQrTokens(_tripId, count = 20) {
    return delay(fx.qrTokens.slice(0, count));
  },

  async verifyQrToken(token: string) {
    const van = fx.queue.find((q) => q.collector_role === "driver");
    if (!token || token.length < 20) {
      return delay({
        valid: false,
        code: "malformed" as const,
        message: "This is not a valid pickup code.",
      });
    }
    return delay({
      valid: true,
      jti: "mock-jti",
      collector: {
        id: fx.currentDriver.id,
        name: fx.currentDriver.name,
        name_ur: fx.currentDriver.name_ur ?? null,
        photo_url: null,
        role: "driver" as const,
      },
      children: (van?.sibling_group ?? []).map((s, i) => ({
        pickup_request_id: `req-${i}`,
        student_id: s.student_id,
        student_name: s.student_name,
        student_photo_url: null,
        status: "NEARBY" as const,
        authorized: true,
        reason: null,
      })),
      confirm_visually: "Check both photos before releasing the child.",
    });
  },

  async getMyQueueEntry() {
    return delay(fx.queue.find((q) => q.trip_id === fx.myTrip.id) ?? null);
  },

  async getPrepList(classId) {
    return delay(fx.pickupRequests.filter((r) => r.class_id === classId));
  },

  async markStaged() {
    return delay(undefined);
  },

  async submitHandover() {
    return delay(undefined);
  },
};

