/**
 * Demo fixtures.
 *
 * Deliberately shaped to exercise the cases that are easy to get wrong:
 *   - two sibling groups (one guardian, two children, one trip)
 *   - a van driver carrying six children drawn from four different families
 *   - children of one driver spread across all three classes, so the
 *     multi-class staging path is visible
 *   - one offline classroom device
 *   - one manual-fallback handover, flagged
 *
 * Mirrors what `scripts/seed.py` should produce once module M1.3 rewrites it.
 */

import type {
  Announcement,
  AuditLogEntry,
  ClassRoom,
  ClassroomDevice,
  Handover,
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
  Vehicle,
  WaitTimeStats,
} from "../types/api";

const today = new Date().toISOString().slice(0, 10);
const at = (hhmm: string) => `${today}T${hhmm}:00+05:00`;

export const school: School = {
  id: "sch-0001",
  name: "Roots Montessori — Islamabad",
  lat: 33.6844,
  lng: 73.0479,
  geofence_radius_m: 1000,
  dismissal_time: "13:15",
  timezone: "Asia/Karachi",
};

export const classes: ClassRoom[] = [
  { id: "cls-nur", school_id: school.id, name: "Nursery", teacher_id: "usr-t1", teacher_name: "Sadia Iqbal", student_count: 4 },
  { id: "cls-pra", school_id: school.id, name: "Prep A", teacher_id: "usr-t2", teacher_name: "Nadia Sheikh", student_count: 4 },
  { id: "cls-prb", school_id: school.id, name: "Prep B", teacher_id: "usr-t3", teacher_name: "Rabia Khan", student_count: 4 },
];

export const students: Student[] = [
  { id: "std-01", school_id: school.id, class_id: "cls-nur", class_name: "Nursery", name: "Ali Raza", name_ur: "علی رضا", photo_url: null },
  { id: "std-02", school_id: school.id, class_id: "cls-nur", class_name: "Nursery", name: "Sara Malik", name_ur: "سارہ ملک", photo_url: null },
  { id: "std-03", school_id: school.id, class_id: "cls-nur", class_name: "Nursery", name: "Hamza Butt", name_ur: "حمزہ بٹ", photo_url: null },
  { id: "std-04", school_id: school.id, class_id: "cls-nur", class_name: "Nursery", name: "Ayesha Noor", name_ur: "عائشہ نور", photo_url: null },
  { id: "std-05", school_id: school.id, class_id: "cls-pra", class_name: "Prep A", name: "Bilal Ahmed", name_ur: "بلال احمد", photo_url: null },
  { id: "std-06", school_id: school.id, class_id: "cls-pra", class_name: "Prep A", name: "Zara Raza", name_ur: "زارا رضا", photo_url: null },
  { id: "std-07", school_id: school.id, class_id: "cls-pra", class_name: "Prep A", name: "Usman Chaudhry", name_ur: "عثمان چوہدری", photo_url: null },
  { id: "std-08", school_id: school.id, class_id: "cls-pra", class_name: "Prep A", name: "Hira Sheikh", name_ur: "حرا شیخ", photo_url: null },
  { id: "std-09", school_id: school.id, class_id: "cls-prb", class_name: "Prep B", name: "Fatima Khan", name_ur: "فاطمہ خان", photo_url: null },
  { id: "std-10", school_id: school.id, class_id: "cls-prb", class_name: "Prep B", name: "Omar Malik", name_ur: "عمر ملک", photo_url: null },
  { id: "std-11", school_id: school.id, class_id: "cls-prb", class_name: "Prep B", name: "Mariam Iqbal", name_ur: "مریم اقبال", photo_url: null },
  { id: "std-12", school_id: school.id, class_id: "cls-prb", class_name: "Prep B", name: "Zain Hassan", name_ur: "زین حسن", photo_url: null },
];

export const users: User[] = [
  // Admin + staff
  { id: "usr-adm", school_id: school.id, role: "admin", name: "Imran Qureshi", phone: "+923001112233", locale: "en", photo_url: null },
  { id: "usr-t1", school_id: school.id, role: "teacher", name: "Sadia Iqbal", phone: "+923004445566", locale: "ur", photo_url: null },
  { id: "usr-t2", school_id: school.id, role: "teacher", name: "Nadia Sheikh", phone: "+923004445567", locale: "ur", photo_url: null },
  { id: "usr-t3", school_id: school.id, role: "teacher", name: "Rabia Khan", phone: "+923004445568", locale: "en", photo_url: null },
  { id: "usr-grd", school_id: school.id, role: "guard", name: "Main Gate Guard", phone: "+923007778899", locale: "ur", photo_url: null },

  // Parents. usr-p1 and usr-p4 each have two children — sibling grouping.
  { id: "usr-p1", school_id: school.id, role: "parent", name: "Tariq Raza", name_ur: "طارق رضا", phone: "+923331000001", locale: "en", photo_url: null },
  { id: "usr-p2", school_id: school.id, role: "parent", name: "Nasreen Malik", name_ur: "نسرین ملک", phone: "+923331000002", locale: "ur", photo_url: null },
  { id: "usr-p3", school_id: school.id, role: "parent", name: "Kamran Butt", name_ur: "کامران بٹ", phone: "+923331000003", locale: "en", photo_url: null },
  { id: "usr-p4", school_id: school.id, role: "parent", name: "Shazia Sheikh", name_ur: "شازیہ شیخ", phone: "+923331000004", locale: "ur", photo_url: null },
  { id: "usr-p5", school_id: school.id, role: "parent", name: "Junaid Hassan", name_ur: "جنید حسن", phone: "+923331000005", locale: "en", photo_url: null },
  { id: "usr-p6", school_id: school.id, role: "parent", name: "Farah Iqbal", name_ur: "فرح اقبال", phone: "+923331000006", locale: "ur", photo_url: null },

  // A relative added directly by a parent — no admin vetting.
  { id: "usr-r1", school_id: school.id, role: "parent", name: "Rukhsana Bibi (grandmother)", name_ur: "رخسانہ بی بی", phone: "+923331000090", locale: "ur", photo_url: null },

  // Drivers — school-registered and vetted.
  { id: "usr-d1", school_id: school.id, role: "driver", name: "Ahmed Khan", name_ur: "احمد خان", phone: "+923215000011", locale: "ur", photo_url: null },
  { id: "usr-d2", school_id: school.id, role: "driver", name: "Yousaf Gul", name_ur: "یوسف گل", phone: "+923215000012", locale: "ur", photo_url: null },
];

export const vehicles: Vehicle[] = [
  { id: "veh-01", school_id: school.id, driver_user_id: "usr-d1", driver_name: "Ahmed Khan", registration_no: "ICT-2291", capacity: 12, photo_url: null, authorized_student_count: 6 },
  { id: "veh-02", school_id: school.id, driver_user_id: "usr-d2", driver_name: "Yousaf Gul", registration_no: "ICT-8834", capacity: 8, photo_url: null, authorized_student_count: 2 },
];

/**
 * Ahmed Khan (usr-d1) collects six children from four different families,
 * spread across all three classes. This is the case the original data model
 * could not express, and the one that breaks naive queue logic.
 */
export const authorizations: PickupAuthorization[] = [
  { id: "auth-01", student_id: "std-01", student_name: "Ali Raza", collector_user_id: "usr-d1", collector_name: "Ahmed Khan", collector_role: "driver", granted_by_user_id: "usr-p1", granted_by_name: "Tariq Raza", kind: "standing", valid_from: "2026-01-15", valid_until: null, revoked_at: null },
  { id: "auth-02", student_id: "std-06", student_name: "Zara Raza", collector_user_id: "usr-d1", collector_name: "Ahmed Khan", collector_role: "driver", granted_by_user_id: "usr-p1", granted_by_name: "Tariq Raza", kind: "standing", valid_from: "2026-01-15", valid_until: null, revoked_at: null },
  { id: "auth-03", student_id: "std-02", student_name: "Sara Malik", collector_user_id: "usr-d1", collector_name: "Ahmed Khan", collector_role: "driver", granted_by_user_id: "usr-p2", granted_by_name: "Nasreen Malik", kind: "standing", valid_from: "2026-02-01", valid_until: null, revoked_at: null },
  { id: "auth-04", student_id: "std-10", student_name: "Omar Malik", collector_user_id: "usr-d1", collector_name: "Ahmed Khan", collector_role: "driver", granted_by_user_id: "usr-p2", granted_by_name: "Nasreen Malik", kind: "standing", valid_from: "2026-02-01", valid_until: null, revoked_at: null },
  { id: "auth-05", student_id: "std-08", student_name: "Hira Sheikh", collector_user_id: "usr-d1", collector_name: "Ahmed Khan", collector_role: "driver", granted_by_user_id: "usr-p4", granted_by_name: "Shazia Sheikh", kind: "standing", valid_from: "2026-03-10", valid_until: null, revoked_at: null },
  { id: "auth-06", student_id: "std-12", student_name: "Zain Hassan", collector_user_id: "usr-d1", collector_name: "Ahmed Khan", collector_role: "driver", granted_by_user_id: "usr-p5", granted_by_name: "Junaid Hassan", kind: "standing", valid_from: "2026-03-10", valid_until: null, revoked_at: null },

  { id: "auth-07", student_id: "std-03", student_name: "Hamza Butt", collector_user_id: "usr-d2", collector_name: "Yousaf Gul", collector_role: "driver", granted_by_user_id: "usr-p3", granted_by_name: "Kamran Butt", kind: "standing", valid_from: "2026-01-20", valid_until: null, revoked_at: null },
  { id: "auth-08", student_id: "std-11", student_name: "Mariam Iqbal", collector_user_id: "usr-d2", collector_name: "Yousaf Gul", collector_role: "driver", granted_by_user_id: "usr-p6", granted_by_name: "Farah Iqbal", kind: "standing", valid_from: "2026-01-20", valid_until: null, revoked_at: null },

  // A relative, added directly by the parent — the non-vetted path.
  { id: "auth-09", student_id: "std-04", student_name: "Ayesha Noor", collector_user_id: "usr-r1", collector_name: "Rukhsana Bibi (grandmother)", collector_role: "parent", granted_by_user_id: "usr-p4", granted_by_name: "Shazia Sheikh", kind: "standing", valid_from: "2026-02-14", valid_until: null, revoked_at: null },

  // A one-time pass — same table, expiring.
  { id: "auth-10", student_id: "std-05", student_name: "Bilal Ahmed", collector_user_id: "usr-r1", collector_name: "Rukhsana Bibi (grandmother)", collector_role: "parent", granted_by_user_id: "usr-p3", granted_by_name: "Kamran Butt", kind: "one_time", valid_from: today, valid_until: today, revoked_at: null },

  // Revoked — proves revocation is per-family, not global.
  { id: "auth-11", student_id: "std-07", student_name: "Usman Chaudhry", collector_user_id: "usr-d1", collector_name: "Ahmed Khan", collector_role: "driver", granted_by_user_id: "usr-p6", granted_by_name: "Farah Iqbal", kind: "standing", valid_from: "2026-01-15", valid_until: null, revoked_at: `${today}T09:12:00+05:00` },
];

export const pickupRequests: PickupRequest[] = [
  { id: "req-01", student_id: "std-01", student_name: "Ali Raza", collector_id: "usr-d1", collector_name: "Ahmed Khan", class_id: "cls-nur", date: today, scheduled_time: "13:15", status: "NEARBY", source: "default", trip_id: "trp-01" },
  { id: "req-02", student_id: "std-06", student_name: "Zara Raza", collector_id: "usr-d1", collector_name: "Ahmed Khan", class_id: "cls-pra", date: today, scheduled_time: "13:15", status: "NEARBY", source: "default", trip_id: "trp-01" },
  { id: "req-03", student_id: "std-02", student_name: "Sara Malik", collector_id: "usr-d1", collector_name: "Ahmed Khan", class_id: "cls-nur", date: today, scheduled_time: "13:15", status: "NEARBY", source: "default", trip_id: "trp-01" },
  { id: "req-04", student_id: "std-10", student_name: "Omar Malik", collector_id: "usr-d1", collector_name: "Ahmed Khan", class_id: "cls-prb", date: today, scheduled_time: "13:15", status: "NEARBY", source: "default", trip_id: "trp-01" },
  { id: "req-05", student_id: "std-08", student_name: "Hira Sheikh", collector_id: "usr-d1", collector_name: "Ahmed Khan", class_id: "cls-pra", date: today, scheduled_time: "13:15", status: "NEARBY", source: "default", trip_id: "trp-01" },
  { id: "req-06", student_id: "std-12", student_name: "Zain Hassan", collector_id: "usr-d1", collector_name: "Ahmed Khan", class_id: "cls-prb", date: today, scheduled_time: "13:15", status: "NEARBY", source: "default", trip_id: "trp-01" },
  { id: "req-07", student_id: "std-03", student_name: "Hamza Butt", collector_id: "usr-d2", collector_name: "Yousaf Gul", class_id: "cls-nur", date: today, scheduled_time: "13:20", status: "EN_ROUTE", source: "default", trip_id: "trp-02" },
  { id: "req-08", student_id: "std-11", student_name: "Mariam Iqbal", collector_id: "usr-d2", collector_name: "Yousaf Gul", class_id: "cls-prb", date: today, scheduled_time: "13:20", status: "EN_ROUTE", source: "default", trip_id: "trp-02" },
  { id: "req-09", student_id: "std-04", student_name: "Ayesha Noor", collector_id: "usr-p4", collector_name: "Shazia Sheikh", class_id: "cls-nur", date: today, scheduled_time: "13:15", status: "AT_GATE", source: "default", trip_id: "trp-03" },
  { id: "req-10", student_id: "std-09", student_name: "Fatima Khan", collector_id: "usr-p5", collector_name: "Junaid Hassan", class_id: "cls-prb", date: today, scheduled_time: "13:30", status: "EN_ROUTE", source: "default", trip_id: "trp-04" },
  { id: "req-11", student_id: "std-05", student_name: "Bilal Ahmed", collector_id: "usr-r1", collector_name: "Rukhsana Bibi (grandmother)", class_id: "cls-pra", date: today, scheduled_time: "13:15", status: "HANDED_OVER", source: "exception", trip_id: "trp-05" },
  { id: "req-12", student_id: "std-07", student_name: "Usman Chaudhry", collector_id: "usr-p6", collector_name: "Farah Iqbal", class_id: "cls-pra", date: today, scheduled_time: "13:00", status: "LAPSED", source: "default", trip_id: null },
];

const vanGroup = [
  { student_id: "std-01", student_name: "Ali Raza", class_name: "Nursery" },
  { student_id: "std-02", student_name: "Sara Malik", class_name: "Nursery" },
  { student_id: "std-06", student_name: "Zara Raza", class_name: "Prep A" },
  { student_id: "std-08", student_name: "Hira Sheikh", class_name: "Prep A" },
  { student_id: "std-10", student_name: "Omar Malik", class_name: "Prep B" },
  { student_id: "std-12", student_name: "Zain Hassan", class_name: "Prep B" },
];

export const queue: QueueEntry[] = [
  { pickup_request_id: "req-09", trip_id: "trp-03", student_id: "std-04", student_name: "Ayesha Noor", class_id: "cls-nur", class_name: "Nursery", collector_name: "Shazia Sheikh", collector_role: "parent", status: "AT_GATE", eta_seconds: 0, position: 1, sibling_group: [{ student_id: "std-04", student_name: "Ayesha Noor", class_name: "Nursery" }] },
  { pickup_request_id: "req-01", trip_id: "trp-01", student_id: "std-01", student_name: "Ali Raza", class_id: "cls-nur", class_name: "Nursery", collector_name: "Ahmed Khan · ICT-2291", collector_role: "driver", status: "NEARBY", eta_seconds: 95, position: 2, sibling_group: vanGroup },
  { pickup_request_id: "req-07", trip_id: "trp-02", student_id: "std-03", student_name: "Hamza Butt", class_id: "cls-nur", class_name: "Nursery", collector_name: "Yousaf Gul · ICT-8834", collector_role: "driver", status: "EN_ROUTE", eta_seconds: 340, position: 3, sibling_group: [{ student_id: "std-03", student_name: "Hamza Butt", class_name: "Nursery" }, { student_id: "std-11", student_name: "Mariam Iqbal", class_name: "Prep B" }] },
  { pickup_request_id: "req-10", trip_id: "trp-04", student_id: "std-09", student_name: "Fatima Khan", class_id: "cls-prb", class_name: "Prep B", collector_name: "Junaid Hassan", collector_role: "parent", status: "EN_ROUTE", eta_seconds: 520, position: 4, sibling_group: [{ student_id: "std-09", student_name: "Fatima Khan", class_name: "Prep B" }] },
  { pickup_request_id: "req-12", trip_id: null, student_id: "std-07", student_name: "Usman Chaudhry", class_id: "cls-pra", class_name: "Prep A", collector_name: "Farah Iqbal", collector_role: "parent", status: "LAPSED", eta_seconds: null, position: 5, sibling_group: [{ student_id: "std-07", student_name: "Usman Chaudhry", class_name: "Prep A" }] },
];

export const devices: ClassroomDevice[] = [
  { id: "dev-01", school_id: school.id, class_id: "cls-nur", class_name: "Nursery", device_identifier: "TAB-NUR-01", paired_at: "2026-07-02T08:00:00+05:00", last_seen_at: at("13:04"), online: true },
  { id: "dev-02", school_id: school.id, class_id: "cls-pra", class_name: "Prep A", device_identifier: "TAB-PRA-01", paired_at: "2026-07-02T08:10:00+05:00", last_seen_at: at("13:04"), online: true },
  // Offline. A silent classroom must be visible — see module M6.5.
  { id: "dev-03", school_id: school.id, class_id: "cls-prb", class_name: "Prep B", device_identifier: "TAB-PRB-01", paired_at: "2026-07-02T08:20:00+05:00", last_seen_at: at("12:41"), online: false },
];

export const nameAudio: NameAudio[] = [
  ...students.slice(0, 9).map((s, i) => ({ id: `aud-s${i}`, subject_type: "student" as const, subject_id: s.id, subject_name: s.name, audio_url: `/audio/students/${s.id}.mp3`, duration_ms: 900 + i * 40 })),
  { id: "aud-d1", subject_type: "user", subject_id: "usr-d1", subject_name: "Ahmed Khan", audio_url: "/audio/users/usr-d1.mp3", duration_ms: 1100 },
  { id: "aud-d2", subject_type: "user", subject_id: "usr-d2", subject_name: "Yousaf Gul", audio_url: "/audio/users/usr-d2.mp3", duration_ms: 1050 },
  { id: "aud-p4", subject_type: "user", subject_id: "usr-p4", subject_name: "Shazia Sheikh", audio_url: "/audio/users/usr-p4.mp3", duration_ms: 1200 },
];

export const handovers: Handover[] = [
  { id: "hnd-01", pickup_request_id: "req-11", student_name: "Bilal Ahmed", collector_name: "Rukhsana Bibi (grandmother)", verified_by_user_id: "usr-grd", verified_by_name: "Main Gate Guard", method: "manual", fallback_reason: "no_app", device_id: "GUARD-TAB-01", verified_at: at("13:08") },
];

export const auditLog: AuditLogEntry[] = [
  { id: "log-01", school_id: school.id, actor_user_id: "usr-grd", actor_name: "Main Gate Guard", action: "handover.manual", entity_type: "handover", entity_id: "hnd-01", payload: { reason: "no_app", student: "Bilal Ahmed", collector: "Rukhsana Bibi" }, created_at: at("13:08"), flagged: true },
  { id: "log-02", school_id: school.id, actor_user_id: "usr-p6", actor_name: "Farah Iqbal", action: "authorization.revoke", entity_type: "pickup_authorization", entity_id: "auth-11", payload: { student: "Usman Chaudhry", collector: "Ahmed Khan" }, created_at: at("09:12"), flagged: false },
  { id: "log-03", school_id: school.id, actor_user_id: "usr-adm", actor_name: "Imran Qureshi", action: "driver.register", entity_type: "vehicle", entity_id: "veh-02", payload: { registration_no: "ICT-8834", driver: "Yousaf Gul" }, created_at: at("08:30"), flagged: false },
  { id: "log-04", school_id: school.id, actor_user_id: "usr-t2", actor_name: "Nadia Sheikh", action: "pickup_request.stage", entity_type: "pickup_request", entity_id: "req-09", payload: { student: "Ayesha Noor" }, created_at: at("13:06"), flagged: false },
  { id: "log-05", school_id: school.id, actor_user_id: null, actor_name: "system", action: "pickup_request.lapsed", entity_type: "pickup_request", entity_id: "req-12", payload: { student: "Usman Chaudhry", grace_minutes: 20 }, created_at: at("13:20"), flagged: false },
];

export const announcements: Announcement[] = [
  { id: "ann-01", school_id: school.id, title_en: "Early dismissal Friday", title_ur: "جمعہ کو جلد چھٹی", body_en: "School will close at 11:30 AM this Friday for staff training.", body_ur: "عملے کی تربیت کے باعث اس جمعہ اسکول صبح ۱۱:۳۰ بجے بند ہو جائے گا۔", sent_at: at("08:00"), audience: "all" },
  { id: "ann-02", school_id: school.id, title_en: "Prep B parent meeting", title_ur: "پریپ بی والدین میٹنگ", body_en: "Prep B parent-teacher meeting is on Wednesday at 2 PM.", body_ur: "پریپ بی والدین اساتذہ میٹنگ بدھ کو دوپہر ۲ بجے ہے۔", sent_at: null, audience: "class" },
];

export const waitTimes: WaitTimeStats = {
  average_wait_seconds: 168,
  median_wait_seconds: 142,
  by_day: [
    { date: "2026-07-30", average_wait_seconds: 402 },
    { date: "2026-07-31", average_wait_seconds: 351 },
    { date: "2026-08-01", average_wait_seconds: 288 },
    { date: "2026-08-03", average_wait_seconds: 241 },
    { date: "2026-08-04", average_wait_seconds: 195 },
    { date: "2026-08-05", average_wait_seconds: 174 },
    { date: "2026-08-06", average_wait_seconds: 168 },
  ],
  peak_minutes: [
    { minute: "13:00", count: 2 }, { minute: "13:05", count: 4 },
    { minute: "13:10", count: 7 }, { minute: "13:15", count: 11 },
    { minute: "13:20", count: 8 }, { minute: "13:25", count: 5 },
    { minute: "13:30", count: 3 }, { minute: "13:35", count: 1 },
  ],
};

export const onTime: OnTimeStats = {
  on_time_rate: 0.87,
  total_pickups: 246,
  manual_fallback_rate: 0.06,
};

/**
 * The signed-in parent for the mobile skeleton: Tariq Raza, two children
 * (Ali in Nursery, Zara in Prep A) — a sibling group — who normally travel
 * with Ahmed Khan's van.
 */
export const currentParent = users.find((u) => u.id === "usr-p1")!;
export const currentDriver = users.find((u) => u.id === "usr-d1")!;
export const currentTeacher = users.find((u) => u.id === "usr-t1")!;
export const currentGuard = users.find((u) => u.id === "usr-grd")!;

export const myChildren: Student[] = students.filter((s) =>
  ["std-01", "std-06"].includes(s.id),
);

export const schedules: Schedule[] = myChildren.flatMap((child) =>
  [0, 1, 2, 3, 4].map((weekday) => ({
    id: `sch-${child.id}-${weekday}`,
    student_id: child.id,
    // Van Monday–Thursday, father on Friday. The per-weekday collector column
    // gives this with no extra structure.
    collector_id: weekday === 4 ? "usr-p1" : "usr-d1",
    weekday,
    pickup_time: "13:15",
  })),
);

export const myTrip: Trip = {
  id: "trp-01",
  collector_user_id: "usr-d1",
  date: today,
  started_at: at("12:58"),
  last_lat: 33.6901,
  last_lng: 73.0512,
  eta_seconds: 95,
  entered_geofence_at: at("13:06"),
  arrived_at: null,
};

/**
 * A batch of pre-signed QR tokens.
 *
 * Real tokens are ES256-signed JWTs fetched at trip start so the gate works
 * with no signal. NOTE: 20 tokens × 60s ≈ 20 minutes of cover against a trip
 * window of up to 90 — see module M7.1, the batch needs sizing to the window.
 */
export const qrTokens: QrTokenBatchItem[] = Array.from({ length: 20 }, (_, i) => ({
  token: `eyJhbGciOiJFUzI1NiJ9.mock-token-${String(i).padStart(2, "0")}.signature`,
  exp: new Date(Date.now() + (i + 1) * 60_000).toISOString(),
}));
