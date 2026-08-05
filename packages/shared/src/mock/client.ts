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
  Announcement,
  AuditLogEntry,
  ClassRoom,
  ClassroomDevice,
  Handover,
  IsoDate,
  LoginRequest,
  LoginResponse,
  NameAudio,
  OnTimeStats,
  PickupAuthorization,
  PickupRequest,
  QrTokenBatchItem,
  QueueEntry,
  Schedule,
  School,
  Student,
  Trip,
  User,
  Uuid,
  Vehicle,
  WaitTimeStats,
} from "../types/api";
import * as fx from "./fixtures";

export interface PickupApi {
  login(body: LoginRequest): Promise<LoginResponse>;
  me(): Promise<User>;

  listSchools(): Promise<School[]>;
  listClasses(schoolId?: Uuid): Promise<ClassRoom[]>;
  listStudents(classId?: Uuid): Promise<Student[]>;
  searchStudents(query: string): Promise<Student[]>;
  listUsers(role?: User["role"]): Promise<User[]>;

  listVehicles(): Promise<Vehicle[]>;
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
  getMyPickupRequests(date?: IsoDate): Promise<PickupRequest[]>;
  /** Collectors this parent has authorized for their own children. */
  getMyCollectors(): Promise<PickupAuthorization[]>;
  /** A driver's cross-family list for today. Parents get their own children. */
  getMyManifest(): Promise<PickupRequest[]>;
  getMyTrip(): Promise<Trip | null>;
  startTrip(): Promise<Trip>;
  endTrip(tripId: Uuid): Promise<void>;
  /** Pre-signed batch fetched at trip start so the gate works with no signal. */
  getQrTokens(tripId: Uuid, count?: number): Promise<QrTokenBatchItem[]>;
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

  async me() {
    return delay(fx.users.find((u) => u.role === "admin")!);
  },

  async listSchools() {
    return delay([fx.school]);
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

  async listUsers(role) {
    return delay(role ? fx.users.filter((u) => u.role === role) : fx.users);
  },

  async listVehicles() {
    return delay(fx.vehicles);
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

