/**
 * Real HTTP client.
 *
 * Implements the same `PickupApi` interface as `mockApi`, so switching between
 * them is one line at one call site rather than a pass over 37 screens. That
 * was the whole point of building the skeleton against a typed contract.
 *
 * Keep every method aligned with `docs/api/openapi.yaml`.
 */

import type {
  AdminSignupRequest,
  AdminSignupResponse,
  SchoolUpdate,
  Announcement,
  CollectorLookup,
  AuditLogEntry,
  ClassRoom,
  ClassroomDevice,
  DriverRegistration,
  DriverRegistrationResult,
  Handover,
  IsoDate,
  LoginRequest,
  LoginResponse,
  NameAudio,
  ParentRegistration,
  ParentRegistrationResult,
  OnTimeStats,
  PickupAuthorization,
  PickupRequest,
  QrTokenBatchItem,
  QueueEntry,
  ScanResult,
  Schedule,
  School,
  Student,
  Trip,
  User,
  Uuid,
  Vehicle,
  WaitTimeStats,
} from "../types/api";
import type { PickupApi } from "../mock/client";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface TokenStore {
  get(): string | null | Promise<string | null>;
  set(token: string | null): void | Promise<void>;
}

/** Default store: in memory. Apps pass one backed by SecureStore/localStorage. */
export function memoryTokenStore(): TokenStore {
  let token: string | null = null;
  return {
    get: () => token,
    set: (t) => {
      token = t;
    },
  };
}

export interface HttpApiOptions {
  baseUrl: string;
  tokens?: TokenStore;
  /** Called when the server rejects our token, so the app can route to login. */
  onUnauthorized?: () => void;
  timeoutMs?: number;
}

export function createHttpApi(options: HttpApiOptions): PickupApi & {
  tokens: TokenStore;
} {
  const {
    baseUrl,
    tokens = memoryTokenStore(),
    onUnauthorized,
    timeoutMs = 15_000,
  } = options;

  const root = baseUrl.replace(/\/+$/, "");

  async function request<T>(
    path: string,
    init: RequestInit & { query?: Record<string, unknown> } = {},
  ): Promise<T> {
    const { query, ...rest } = init;

    let url = `${root}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const token = await tokens.get();
    // FormData must set its own Content-Type: the header carries a generated
    // multipart boundary, and supplying `application/json` over the top gives
    // the server a body it cannot split — a 422 that looks like a bad payload.
    const isMultipart =
      typeof FormData !== "undefined" && rest.body instanceof FormData;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(rest.body && !isMultipart
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((rest.headers as Record<string, string>) ?? {}),
    };

    // A parent at the gate on bad signal should get a clear failure, not a
    // request that hangs until the OS gives up.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, { ...rest, headers, signal: controller.signal });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        throw new ApiError(0, "timeout", "The request timed out.");
      }
      throw new ApiError(0, "network_error", "Could not reach the server.");
    } finally {
      clearTimeout(timer);
    }

    // A 401 normally means the stored token died, so the app is bounced to the
    // login screen. But `/auth/login` answers 401 for a WRONG PASSWORD, and
    // redirecting there remounts the login screen — wiping both fields and the
    // error message before anyone can read it. The screen just appears to
    // ignore the button. Signing in is the one 401 that is not a dead session.
    if (response.status === 401 && !path.startsWith("/auth/login")) {
      await tokens.set(null);
      onUnauthorized?.();
    }

    if (!response.ok) {
      let code = "http_error";
      let message = `Request failed (${response.status})`;
      let details: unknown;
      try {
        const body = await response.json();
        // FastAPI puts a plain string in `detail`; our own errors use `code`.
        code = body.code ?? code;
        message = body.message ?? body.detail ?? message;
        details = body.details;
      } catch {
        /* non-JSON error body — keep the defaults */
      }
      throw new ApiError(response.status, code, message, details);
    }

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // Endpoints like /schools/{id}/public-key return text/plain.
      return text as unknown as T;
    }
  }

  const get = <T>(path: string, query?: Record<string, unknown>) =>
    request<T>(path, { method: "GET", query });

  const post = <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  return {
    tokens,

    async login(body: LoginRequest) {
      const res = await request<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });
      await tokens.set(res.access_token);
      return res;
    },

    /**
     * Self-registration. Both are deliberately unauthenticated — the whole
     * point is that a person with no account can create one.
     *
     * Neither signs the user in. Registration and login stay separate so the
     * result screen can show what actually happened (which children matched,
     * or that a driver is waiting to be linked) before the app moves on.
     */
    registerParent: (body: ParentRegistration) =>
      request<ParentRegistrationResult>("/auth/register/parent", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    registerDriver: (body: DriverRegistration) =>
      request<DriverRegistrationResult>("/auth/register/driver", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    me: () => get<User>("/users/me"),

    updateMe: (body) =>
      request<User>("/users/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),

    listSchools: () => get<School[]>("/schools"),

    /**
     * For the registration screens only. `/schools` requires a token, which a
     * person creating their first account does not have — calling it there
     * fails with a 401 that looks like a network fault.
     */
    listSchoolsPublic: () => get<School[]>("/schools/public"),

    registerAdmin: (body: AdminSignupRequest) =>
      post<AdminSignupResponse>("/auth/register-admin", body),

    updateSchool: (schoolId: Uuid, patch: SchoolUpdate) =>
      request<School>(`/schools/${schoolId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),

    /**
     * Upload one photograph, returning the KEY to store — never a URL. The
     * server signs a short-lived link at read time; persisting a signed URL
     * would bake in an expiry and give photos that 403 the next day.
     *
     * Unauthenticated, because a driver registering has no account yet.
     * `uri` is a local `file://` path from the camera.
     */
    async uploadPhoto(uri: string, purpose: string) {
      // A real Blob, not the `{ uri, name, type }` object React Native used to
      // accept. Under the New Architecture that shape is rejected inside the
      // native layer with "Unsupported FormDataPart implementation" — thrown
      // by fetch before a request is made, so it surfaces as a status-0
      // network error and reads as the server being unreachable when the
      // server was never contacted at all.
      //
      // Reading the file:// URI back through fetch is what turns it into one.
      const file = await fetch(uri).then((r) => r.blob());

      const form = new FormData();
      // The filename matters only for the extension the server sees.
      form.append("file", file, `${purpose}.jpg`);

      // No Content-Type header set by hand: fetch has to add the multipart
      // boundary itself, and supplying the header without it makes the server
      // reject a body it cannot split.
      return request<{ key: string; url: string | null }>(
        `/uploads/photo?purpose=${encodeURIComponent(purpose)}`,
        { method: "POST", body: form as unknown as BodyInit },
      );
    },
    listClasses: (schoolId?: Uuid) => get<ClassRoom[]>("/classes", { school_id: schoolId }),
    listStudents: (classId?: Uuid) => get<Student[]>("/students", { class_id: classId }),
    searchStudents: (q: string) =>
      q.trim() ? get<Student[]>("/students/search", { q }) : Promise.resolve([]),
    listUsers: (role?: User["role"]) => get<User[]>("/users", { role }),

    createUser: (body: {
      role: User["role"];
      name: string;
      name_ur?: string | null;
      phone: string;
      password: string;
    }) => post<User>("/users", body),

    createClass: (body: { name: string; teacher_id?: Uuid | null }) =>
      post<ClassRoom>("/classes", body),

    createStudent: (body: {
      name: string;
      name_ur?: string | null;
      class_id: Uuid;
      guardian_cnic?: string | null;
    }) => post<Student>("/students", body),

    linkGuardian: (studentId: Uuid, body: { user_id: Uuid; relation?: string }) =>
      post<unknown>(`/students/${studentId}/guardians`, body),

    listVehicles: () => get<Vehicle[]>("/vehicles"),

    // `+` in a query string decodes to a space, so it must be encoded here or
    // the server sees a leading space and 404s on a number that exists.
    lookupCollector: (phone: string) =>
      get<CollectorLookup>(`/collectors/lookup?phone=${encodeURIComponent(phone.trim())}`),

    grantAuthorization: (studentId: Uuid, collectorUserId: Uuid) =>
      post<PickupAuthorization>(`/students/${studentId}/authorizations`, {
        collector_user_id: collectorUserId,
      }),

    async listAuthorizations(filter) {
      if (filter?.studentId) {
        return get<PickupAuthorization[]>(
          `/students/${filter.studentId}/authorizations`,
        );
      }
      // No cross-student listing exists by design — authorizations are always
      // read in the context of a child or of the granting parent.
      return get<PickupAuthorization[]>("/me/collectors");
    },

    revokeAuthorization: (id: Uuid) =>
      request<void>(`/authorizations/${id}`, { method: "DELETE" }),

    listPickupRequests: (params) =>
      get<PickupRequest[]>("/pickup-requests", {
        class_id: params?.classId,
        date: params?.date,
      }),

    getQueue: (classId?: Uuid) => get<QueueEntry[]>("/queue", { class_id: classId }),

    listDevices: () => get<ClassroomDevice[]>("/devices"),
    listNameAudio: () => get<NameAudio[]>("/name-audio"),

    listHandovers: () => get<Handover[]>("/handovers"),
    listAuditLog: (params) =>
      get<AuditLogEntry[]>("/audit-log", { flagged_only: params?.flaggedOnly }),
    listAnnouncements: () => get<Announcement[]>("/announcements"),

    getWaitTimes: () => get<WaitTimeStats>("/analytics/wait-times"),
    getOnTimeRate: () => get<OnTimeStats>("/analytics/on-time-rate"),

    // ── Mobile surfaces ────────────────────────────────────────────────
    getMyChildren: () => get<Student[]>("/me/children"),
    getMySchedules: () => get<Schedule[]>("/me/schedules"),
    getMyPickupRequests: (date?: IsoDate) =>
      get<PickupRequest[]>("/me/manifest", { date }),
    getMyCollectors: () => get<PickupAuthorization[]>("/me/collectors"),
    getMyManifest: () => get<PickupRequest[]>("/me/manifest"),
    getMyTrip: () => get<Trip | null>("/me/trip"),

    getMyChildrenPickups: (date?: IsoDate) =>
      get<PickupRequest[]>("/me/children-pickups", { date }),

    postLocation: (tripId: Uuid, ping: { lat: number; lng: number }) =>
      post<{
        eta_seconds: number;
        distance_m: number;
        inside_geofence: boolean;
        status: string;
        announced_to: string[];
      }>(`/trips/${tripId}/location`, ping),

    startTrip: () => post<Trip>("/trips/start"),
    endTrip: (tripId: Uuid) => post<void>(`/trips/${tripId}/end`),

    // Default sized to the trip window, not a round number: 20 tokens is
    // ~20 minutes against a trip that can run 90.
    getQrTokens: (tripId: Uuid, count = 90) =>
      post<QrTokenBatchItem[]>("/qr-tokens/batch", { trip_id: tripId, count }),

    verifyQrToken: (token: string, deviceId: string) =>
      post<ScanResult>("/qr-tokens/verify", { token, device_id: deviceId }),

    async getMyQueueEntry() {
      // Derived from the class-wide queue until /me/queue-entry ships, so the
      // screen works today and the swap later is invisible to it.
      const [trip, queue] = await Promise.all([
        get<Trip | null>("/me/trip"),
        get<QueueEntry[]>("/queue"),
      ]);
      if (!trip) return null;
      return queue.find((q) => q.trip_id === trip.id) ?? null;
    },

    getPrepList: (classId: Uuid) =>
      get<PickupRequest[]>("/pickup-requests", { class_id: classId }),

    markStaged: (id: Uuid) => post<void>(`/pickup-requests/${id}/stage`),
    submitHandover: (body: Handover) => post<void>("/handovers", body),
  };
}
