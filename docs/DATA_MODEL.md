# Data Model

Source of truth for the schema, kept in step with `backend/app/models.py`. If a
migration needs to diverge, this file changes in the same commit.

**Status:** shipped as Alembic revision `d8c552641c1a` (initial schema).
16 tables, verified upgrade → downgrade → upgrade with no errors.

## Three renames from the original design

A driver is a *collector* but is not a guardian of anyone, so every column that
assumed "the person collecting is a parent of this child" had to change:

| Original | Now |
|---|---|
| `trips.guardian_id` | `trips.collector_user_id` |
| `schedules.guardian_id` | `schedules.collector_id` |
| `pickup_requests.guardian_id` | `pickup_requests.collector_id` |

`users.role` also gains `driver`.

## Tables

```sql
schools               (id, name, lat, lng, geofence_radius_m, dismissal_time,
                       timezone, public_key, private_key_enc)

users                 (id, school_id, role, name, name_ur, phone, password_hash,
                       locale, photo_url, fcm_token, is_active)
                       -- role ∈ {parent, teacher, guard, admin, driver}

classes               (id, school_id, name, teacher_id)

students              (id, school_id, class_id, name, name_ur, photo_url)

guardianships         (id, student_id, user_id, relation, is_primary, can_delegate)
                       -- many-to-many; sibling grouping falls out of this
                       -- can_delegate gates who may authorize a collector

pickup_authorizations (id, student_id, collector_user_id, granted_by_user_id,
                       kind, valid_from, valid_until, revoked_at)
                       -- kind ∈ {standing, one_time}
                       -- REPLACES the original delegate_passes table
                       -- revocation is per-family, never global

vehicles              (id, school_id, driver_user_id, registration_no,
                       capacity, photo_url)

schedules             (id, student_id, collector_id, weekday, pickup_time)
                       -- recurring default; collector varies BY WEEKDAY, which
                       -- is what gives "van Mon–Thu, father Friday" for free

trips                 (id, collector_user_id, date, started_at, last_lat,
                       last_lng, eta_seconds, entered_geofence_at, arrived_at,
                       ended_at)
                       -- ONE trip covers every child this collector fetches
                       -- today; for a driver that spans many families

pickup_requests       (id, student_id, collector_id, trip_id, date,
                       scheduled_time, status, source)
                       -- source ∈ {default, exception}
                       -- status: SCHEDULED → EN_ROUTE → NEARBY → AT_GATE →
                       --         HANDED_OVER  (or CANCELLED / LAPSED)

handovers             (id, pickup_request_id, verified_by_user_id,
                       collector_user_id, method, fallback_reason,
                       verified_at, device_id, qr_jti)
                       -- method ∈ {qr, manual}
                       -- qr_jti is UNIQUE: makes offline batch sync idempotent
                       --   and stops a token being replayed on a second device

audit_log             (id, school_id, actor_user_id, action, entity_type,
                       entity_id, payload, flagged, created_at)
                       -- flagged surfaces manual handovers for school review

classroom_devices     (id, school_id, class_id, device_identifier,
                       pairing_code, paired_at, last_seen_at)
                       -- last_seen_at is the ONLY way a silent classroom
                       -- becomes visible; announcements have no offline path

name_audio            (id, subject_type, subject_id, audio_url, duration_ms)
                       -- subject_type ∈ {student, user}
                       -- ONE clip serves both languages — a name sounds the
                       -- same either way; only template phrases are recorded twice

spoken_announcements  (id, class_id, trip_id, student_ids, eta_seconds,
                       spoken_at, played_ok, created_at)
                       -- UNIQUE(class_id, trip_id): a trip announces once per
                       -- class. Without batching, thirty arrivals over a
                       -- 90-minute dismissal means one announcement every
                       -- ~30 seconds in every room.

announcements         (id, school_id, title_en, title_ur, body_en, body_ur,
                       sent_at, audience, class_id)
                       -- both languages in the same row; there is no
                       -- "translate later" path
```

Every table except `audit_log` and `spoken_announcements` also carries
`created_at` / `updated_at`.

## Foreign key / creation order

Alembic's autogenerate resolved this correctly; it is recorded here for anyone
writing a manual migration:

1. `schools`
2. `users` (→ schools)
3. `classes` (→ schools, users as teacher_id)
4. `students` (→ schools, classes)
5. `guardianships` (→ students, users)
6. `vehicles` (→ schools, users)
7. `pickup_authorizations` (→ students, users ×2)
8. `schedules` (→ students, users)
9. `trips` (→ users)
10. `pickup_requests` (→ students, users, trips)
11. `handovers` (→ pickup_requests, users ×2)
12. `classroom_devices` (→ schools, classes)
13. `name_audio` (no FK — polymorphic subject)
14. `spoken_announcements` (→ classes, trips)
15. `announcements` (→ schools, classes)
16. `audit_log` (→ schools, users)

## Indexes and constraints that matter

| Index / constraint | Why |
|---|---|
| `ix_requests_date_student` | the teacher's daily list runs this constantly |
| `ix_auth_student_collector` | the authorization check runs on every handover |
| `ix_audit_school_created` | the admin log is always filtered and sorted this way |
| `ix_handovers_request` | one handover per request, looked up by request |
| `uq_trip_collector_date` | one active trip per collector per day |
| `uq_request_student_date` | a child cannot be double-booked |
| `uq_announcement_class_trip` | a trip announces once per class, never twice |
| `handovers.qr_jti` UNIQUE | offline sync idempotency + replay protection |

## Sibling grouping — why `trips` sits above `pickup_requests`

One `trip` maps to many `pickup_requests`. A guardian with two children starts
one trip; both children's requests reference it. A **driver** starts one trip
covering children from several different families, often across every class in
the school. The trip only reaches `arrived_at` once every linked request is
`HANDED_OVER`.

Getting this relationship right on day one costs nothing. Retrofitting it means
rewriting queue ordering, staging, and the whole handover flow.

## A migration trap worth knowing

Alembic's autogenerated `downgrade()` drops tables but **not** Postgres ENUM
types. Left as generated, one `downgrade` orphans eight types and the next
`upgrade head` dies with `DuplicateObject: type "..." already exists` — the
database is then stuck until someone drops them by hand.

The initial migration has an explicit `DROP TYPE IF EXISTS` block at the end of
`downgrade()`. **Any future migration that adds an enum must do the same.**
