# Data Model

Source of truth for the schema. Any migration should match this exactly — if you need to deviate, update this file in the same commit.

## Tables

```sql
schools            (id, name, lat, lng, geofence_radius_m,
                    dismissal_time, timezone, public_key, private_key_enc)

users              (id, school_id, role, name, phone, password_hash,
                    locale, photo_url, fcm_token)
                    -- role ∈ {parent, teacher, guard, admin}

classes            (id, school_id, name, teacher_id)

students           (id, school_id, class_id, name, photo_url)

guardianships      (id, student_id, user_id, relation,
                    is_primary, can_delegate)
                    -- many-to-many: sibling grouping falls out of this

schedules          (id, student_id, guardian_id, weekday, pickup_time)
                    -- recurring default

pickup_requests    (id, student_id, guardian_id, date, scheduled_time,
                    status, source)
                    -- source ∈ {default, exception}
                    -- status: SCHEDULED → EN_ROUTE → NEARBY → AT_GATE → HANDED_OVER
                    --         (or CANCELLED / LAPSED)

trips              (id, guardian_id, date, started_at, last_lat, last_lng,
                    eta_seconds, entered_geofence_at, arrived_at)
                    -- ONE trip covers ALL of a guardian's pickup_requests for the day

delegate_passes    (id, pickup_request_id, delegate_name, delegate_phone,
                    photo_url, expires_at, used_at)

handovers          (id, pickup_request_id, verified_by_user_id, method,
                    fallback_reason, verified_at, device_id)
                    -- method ∈ {qr, manual}

announcements      (id, school_id, title_en, title_ur, body_en, body_ur,
                    sent_at, audience)

audit_log          (id, school_id, actor_user_id, action,
                    entity_type, entity_id, payload, created_at)
```

## Foreign key / creation order

Create in this order so Alembic's first migration doesn't hit FK errors:

1. `schools`
2. `users` (→ schools)
3. `classes` (→ schools, users as teacher_id)
4. `students` (→ schools, classes)
5. `guardianships` (→ students, users)
6. `schedules` (→ students, users)
7. `trips` (→ users)
8. `pickup_requests` (→ students, users, optionally → trips once a trip starts)
9. `delegate_passes` (→ pickup_requests)
10. `handovers` (→ pickup_requests, users)
11. `announcements` (→ schools)
12. `audit_log` (→ schools, users)

## Indexes worth adding from the first migration

- `pickup_requests(date, student_id)` — the query the teacher's daily list runs constantly
- `trips(guardian_id, date)` — one active trip per guardian per day
- `handovers(pickup_request_id)` — one handover per request, lookups by request
- `audit_log(school_id, created_at)` — admin log is always filtered and sorted this way

## Sibling grouping — why `trips` sits above `pickup_requests`

One `trip` maps to many `pickup_requests` (via `guardian_id` + `date`). A guardian with two children at the same school starts one trip; both children's `pickup_requests` reference it. The trip only reaches `arrived_at` once every linked request is `HANDED_OVER`. Build this relationship now even if the UI for it ships in week two — retrofitting it later means rewriting queue ordering.
