# Module Plan — Dependency-Ordered Build Sequence

> ## Status — updated 7 Aug 2026
>
> **Live:** https://api.tideover.site · https://admin.tideover.site
>
> | | |
> |---|---|
> | Modules | **41 of 44** |
> | Endpoints | 48 REST + 2 WebSocket |
> | API contract | 51 paths, **zero undocumented endpoints** |
> | Tests | **189 backend** + 22 frontend |
> | Screens | 37 (12 parent · 9 staff · 16 admin/display) |
>
> `pnpm verify` runs typecheck across 5 packages, a migration round-trip,
> a reseed, all tests, and the admin build.
>
> **What works end to end, verified against production:**
> driver self-registers → invisible to the school → parent links him by phone →
> he appears → trip starts → location streams → ETA drops → **announcement
> fires once per class at ~120s and does not repeat** → teacher stages →
> guard scans a real ES256 token → per-child authorization re-checked →
> handover → audit log. Plus one-off passes, manual fallback, and the
> nightly job.
>
> **Not built (3):**
> - **M0.5** Play Console — not on the competition path (delivery is a direct APK)
> - **M8.2** push notifications — needs your Firebase project
> - **M9.2** Urdu QA pass — strings exist in both languages; needs a device sweep
>
> **Deferred by agreement:** vans as entities with drivers as reassignable
> assignments. Correct, but a substitute driver will not occur during a demo.
>
> **Stubbed pending a dev build:** guard camera (`expo-camera`) — the code is
> pasted instead of scanned, but everything after that point is the real
> cryptographic path.

This is the **build order**: what gets built first, what unblocks what, and when
each module is done. It is ordered by *dependency*, not by calendar day.

`BUILD_PLAN.md` is the calendar view. Where the two disagree, this file wins on
*ordering* and `BUILD_PLAN.md` wins on *dates*. Note that `BUILD_PLAN.md`'s
Person A / Person B columns are stale — tasks are not divided by person on this
team; both developers pick up whatever is next in this list.

## How to read this

Each module states what it **delivers**, what it **depends on**, and what
**done** means. A module is not done until its "Done when" line is true — not
when the code compiles.

**Rule:** never start a module whose dependencies aren't done. The order below
already respects this, so working top-to-bottom is safe.

---

## The two structural changes this plan absorbs

Both were agreed after the original docs were written, and both ripple widely.

**1. Collectors, not just guardians.** A *collector* is anyone who physically
shows up: a parent, a relative, or a van driver. Drivers serve many families at
once and are registered by the school; relatives are added directly by a parent.
Both get an app login and a rotating QR.

**2. Voice announcements replace teacher push.** A tablet in each classroom
speaks a stitched audio announcement when a collector is ~2 minutes out. The
teacher's visual queue screen stays as the reference view and the offline
fallback.

Queue ordering is **unchanged** — still live ETA, never booking time. Bookings
drive the prep list only.

---

# Phase 0 — Foundation

Nothing else can start cleanly until these are done. P0.5 has the longest lead
time in the entire project and should be started today regardless of everything
else.

### M0.1 — Repo & collaboration model
Rewrite the ownership model as a **coordination** model across the five
`CLAUDE.md` files and `COLLABORATION.md`. Tasks are not divided by person, so
"Person A owns `backend/`" is actively wrong and will make Claude Code sessions
refuse valid work. Preserve the two rules that protect something real:
concurrent Alembic revisions produce unmergeable history, and contract changes
must be announced before anyone implements against them.

- **Depends on:** nothing
- **Done when:** no file claims per-person ownership; both rules survive as
  coordination rules.

### M0.2 — Design system adaptation  ✅ DONE
Extend `design.md` from a marketing system into an **application** system, in
its own vocabulary. Produce one token source consumed by every surface.

Add what the product needs and `design.md` doesn't have:
- **Queue status treatment** for `SCHEDULED / EN_ROUTE / NEARBY / AT_GATE /
  HANDED_OVER / CANCELLED / LAPSED`. Carry state via type weight, hairline
  weight, and the two semantic tokens — **not** the timeline pastels, which
  `design.md` scopes to agent visualizations only.
- **High-contrast ink-inverted variant** for the guard verdict screen and the
  classroom display. Outdoor sun and across-the-room legibility. Uses the
  ink-inversion precedent already set by `pricing-tier-featured`.
- **Urdu type ramp** — Noto Nastaliq Urdu, letter-spacing forced to 0 (negative
  tracking breaks Nastaliq's connected script), line-height 1.8–2.0. Plus RTL
  mirroring rules for every layout primitive.
- **New components:** queue row, collector card, QR display, scanner verdict,
  announcement card, child chip, staging list row.

Token delivery: `packages/shared/tokens` as the source of truth → a Tailwind
preset for the web surfaces, a JS theme object for the RN apps.

- **Depends on:** nothing
- **Done when:** one token file drives all three surfaces; a swatch/type
  specimen page renders in both light and ink-inverted modes, in en and ur.

### M0.3 — API contract v1
Close every gap in `docs/api/openapi.yaml` and add the endpoints the two new
features need. This is the highest-leverage module in the project — it is what
lets two people build in parallel without blocking.

Existing gaps to fix: missing `School` / `Class` / `Guardianship` / `Error`
schemas · `GET /schools` wrongly returns `User[]` · four POSTs have no request
body · no error responses · no pagination · no token expiry on login.

New endpoints:
- `GET /schools/{id}/drivers` — approved driver list a parent picks from
- `POST /students/{id}/authorizations`, `DELETE /authorizations/{id}`
- `GET /me/collectors` — parent's own collector list
- `GET /me/manifest?date=` — a driver's cross-family pickup list for today
- `PATCH /users/me` — FCM token registration *(currently impossible; push cannot work without it)*
- `POST /pickup-requests/{id}/stage` — teacher marks a child staged
- `GET /students/search` — guard manual-fallback lookup
- `POST /trips/{id}/end`
- `POST /devices/classroom/pair`, heartbeat
- `GET /ws/classroom/{class_id}` — announcement stream
- `POST /students/{id}/name-audio`, `POST /users/{id}/name-audio`
- `GET /classes/{id}/audio-manifest` — clips the tablet caches

- **Depends on:** nothing
- **Done when:** every Tier 1 screen can be built against the contract with no
  undocumented shapes, and the spec passes a validator.

### M0.4 — Infrastructure
EC2, Postgres, Redis, Caddy, domain, **AWS budget alert at $20 first**.

Fix the three commands in `DEPLOYMENT.md` that fail as written: `GRANT ALL
PRIVILEGES ON DATABASE` is insufficient on PG15+ (Ubuntu 24.04 ships PG16 —
Alembic will fail with permission denied without `GRANT ALL ON SCHEMA public`);
Caddy is not in Ubuntu's default apt repos; `npm run start` needs a prior
`npm run build`.

- **Depends on:** nothing
- **Done when:** `https://api.<domain>/health` returns 200 over TLS, and both
  developers can reach Postgres from their machines.

### M0.5 — Play Console registration ⚠️ START TODAY
Identity verification takes days and blocks nothing else — but nothing can
unblock *it*. Two apps, two listings, each needing its own 12-tester / 14-day
closed test.

- **Depends on:** nothing
- **Done when:** account verified, both app listings created.

---

# Phase 1 — Data & Auth

### M1.1 — Schema + first migration
All 12 original tables plus the new ones, in the FK order in `DATA_MODEL.md`.

New tables:
```
pickup_authorizations (id, student_id, collector_user_id, granted_by_user_id,
                       kind, valid_from, valid_until, revoked_at)
                       -- kind ∈ {standing, one_time}
vehicles              (id, school_id, driver_user_id, registration_no,
                       capacity, photo_url)
classroom_devices     (id, school_id, class_id, device_identifier,
                       paired_at, last_seen_at)
name_audio            (id, subject_type, subject_id, audio_url, duration_ms)
                       -- subject_type ∈ {student, user}
announcements_spoken  (id, class_id, trip_id, student_ids, spoken_at, played_ok)
```

Renames (a driver is not a guardian):
`trips.guardian_id` → `collector_user_id` · `schedules.guardian_id` →
`collector_id` · `pickup_requests.guardian_id` → `collector_id`

`users.role` gains `driver`. Indexes per `DATA_MODEL.md`, plus
`pickup_authorizations(student_id, collector_user_id)`.

- **Depends on:** M0.4
- **Done when:** migration applies clean on the EC2 database and rolls back.

### M1.2 — Auth & role guards
JWT, password hashing (add `argon2-cffi` — currently missing from
`requirements.txt`), `/auth/login`, `/users/me`, role-based dependencies.

**Decide here:** replace `python-jose` with `pyjwt[crypto]`. python-jose's last
release was 2021 and it carries 2024 CVEs. It signs the QR tokens — the security
core of a child-safety system. A 10-minute swap now, a rewrite later.

- **Depends on:** M1.1
- **Done when:** all four roles authenticate and role guards reject correctly.

### M1.3 — Seed script rewrite
`scripts/seed.py` currently produces a dataset that cannot demo. Fix all of it:

- omits `password_hash` → **no seeded user can log in**, and the insert fails
  outright if the column is `NOT NULL`
- omits `classes.teacher_id`, and creates teachers *after* classes → **no
  teacher is linked to any class**; the teacher's queue is permanently empty
- omits the school's `public_key` / `private_key_enc` → QR signing has no key
- `random.sample(guardian_ids, k=2)` picks two *unrelated* guardians per student
  → **zero sibling groups**, so the headline feature has nothing to demo
- claims "safe to rerun" while not clearing data → silently duplicates rows
- hardcodes `DATABASE_URL` instead of reading env

Add: 2 van drivers with 6–8 children each across multiple families, standing
authorizations, 3 classroom devices, deliberate sibling groups, name audio clips.

- **Depends on:** M1.1, M1.2
- **Done when:** a fresh seed produces a dataset every Tier 1 screen can demo,
  and rerunning is idempotent.

### M1.4a — App shells + all 37 screens (mocked)  ✅ DONE
Scaffold `parent-app`, `staff-app` (Expo), `admin-web` (Next.js). Navigation,
role routing, i18n (en + ur from the first screen), design tokens from M0.2
wired in, GSAP on web, Reanimated 3 + Moti on RN.

- **Depends on:** M0.2, M0.3, M1.2
- **Done when:** all four surfaces route by role with a language toggle that flips to RTL.
- **M1.4b (outstanding):** swap `mockApi` for the HTTP client behind the same
  `PickupApi` interface. One call site, not 37 screens.

---

# Phase 2 — People & Authorization

The new core. Everything downstream asks "may this person collect this child
today?" — that question has to have an answer first.

### M2.1 — Admin CRUD
Schools, classes, students, guardians, staff. Photo upload to S3.
- **Depends on:** M1.4 · **Done when:** a school can be set up end to end from scratch.

### M2.2 — Admin driver registry
Register and vet drivers, vehicle details, per-school approved list.
- **Depends on:** M2.1 · **Done when:** a driver exists as one account, visible to parents.

### M2.3 — Parent collector management
Parent is the head of the account. Two paths, one model:
- **Driver** — pick from the school's vetted list, grant per-child.
- **Relative / nanny** — parent adds directly, no admin vetting, grants per-child.

Both are `kind = standing` and both get an app login and a rotating QR.
Revocation is per-family: one parent removing a driver does not affect any other
family's authorization.

- **Depends on:** M2.2 · **Done when:** a parent can add, scope, and revoke a
  collector, and revocation takes effect the same day.

### M2.4 — Authorization enforcement
One service answering *"may user X collect student Y on date D?"*, consulting
guardianships and `pickup_authorizations`. Every handover path calls it.
- **Depends on:** M2.3 · **Done when:** unauthorized attempts are refused and logged.

### M2.5 — Handover, audit log & manual fallback ⭐ PULLED EARLY
`handovers` table, audit log, and the guard's manual-fallback flow: search
student → show authorized collectors with photos → pick who is present → reason
(`phone_dead` / `no_app` / `scan_failed` / `other`) → confirm → logged as
`method=MANUAL`, flagged for admin review.

**Why this is here and not in Phase 7.** Manual fallback, the audit log, and
Urdu are the three things marked *never cut* — but in the original plan they sat
on Day 5, behind the riskiest work in the project. Manual fallback has **no
dependency on QR at all**: it needs a student search, an authorization list, and
a handover record, all of which exist by the end of Phase 2. Building it here
makes the un-cuttable features literally un-cuttable, and gives a working
end-to-end handover demo before any of the hard realtime work starts.

- **Depends on:** M2.4
- **Done when:** a guard can complete and log a handover with no QR, no network,
  and no queue — and it appears flagged in the admin audit log.

---

# Phase 3 — Schedules & Requests

### M3.1 — Schedule CRUD
Recurring weekly default, collector per weekday. The existing per-weekday
`collector_id` gives "van Mon–Thu, father Friday" with no new structure.
- **Depends on:** M2.4

### M3.2 — Nightly generation job
APScheduler generates tomorrow's `pickup_requests` at midnight.
- **Depends on:** M3.1 · **Done when:** requests appear overnight, idempotent on rerun.

### M3.3 — Parent schedule & exception UI
Set weekly default once; open the app only to make an exception ("absent today",
"my brother at 2 PM").
- **Depends on:** M3.1

### M3.4 — Teacher prep list
Today's class list from bookings. This is the prep list — **not** the queue order.
- **Depends on:** M3.2

---

# Phase 4 — Live Tracking & ETA

### M4.1 — Trip lifecycle
`POST /trips/start` (one trip covers every child that collector is fetching
today, across families for a driver), `POST /trips/{id}/end`, 90-minute auto-stop.
- **Depends on:** M3.2

### M4.2 — Location ingest
~15s foreground stream → Redis. Raw history purged at 24h; only
`entered_geofence_at` and `arrived_at` persist.
- **Depends on:** M4.1

### M4.3 — ETA service
Haversine ÷ rolling average speed, server-side. **Not** the Google Routes API —
Maps SDK renders the map and nothing else.
- **Depends on:** M4.2 · **Done when:** ETA is stable enough to order a queue.

### M4.4 — Geofence evaluation
Server-side 1km ring → `entered_geofence_at`. Server-side is what avoids the
background-location permission entirely.
- **Depends on:** M4.3

### M4.5 — Collector "On my way" + map
`watchPositionAsync`, foreground only, starts on explicit tap. **No background
location permission, no `expo-task-manager`.** Same screen serves parents,
relatives, and drivers — a driver simply sees a longer, multi-family manifest.
- **Depends on:** M4.1

---

# Phase 5 — Realtime Queue

### M5.1 — Queue ordering service
Order by live ETA among `EN_ROUTE` and `NEARBY`. Booking time never orders the
queue. A late parent falls behind naturally — no penalty logic needed.
A van is **one queue entry** carrying N children, in the same lane as everyone
else (no separate van lane).
- **Depends on:** M4.3

### M5.2 — WebSocket broadcast
`/ws/queue/{class_id}`, push on every state change, Redis pub/sub.
- **Depends on:** M5.1

### M5.3 — Parent queue position
"You are #3, ~6 minutes." Reorder animated with Moti.
- **Depends on:** M5.2

### M5.4 — Teacher live queue + mark staged
`AT_GATE` transition. A van arriving stages children across several classes at once.
- **Depends on:** M5.2

### M5.5 — Admin live queue monitor
All classes at once. GSAP for reorder and arrival transitions.
- **Depends on:** M5.2

---

# Phase 6 — Voice Announcements

Replaces the teacher arrival push. Parent-facing push is unaffected.

### M6.1 — Audio clip pipeline
Admin records/uploads one clip per student and per collector, plus ~6 template
phrases in en and ur. **One name clip covers both languages** — a name sounds
the same either way; only the template phrases need two recordings. Roughly 75
clips for a 30-student school, so the bulk-record UI has to be fast or this
won't get done and the feature dies on arrival. Define the missing-clip fallback
(device TTS, or class + count only).
- **Depends on:** M2.1

### M6.2 — Classroom device pairing
Admin issues a pairing code → tablet binds to one `class_id` → heartbeat.
- **Depends on:** M2.1

### M6.3 — Announcement trigger service
Fires on `eta_seconds < ~120`, **not** on the 1km ring — 1–2 minutes is roughly
500–650m and varies with traffic. The geofence stays, but only for logging.
Batch every child of one trip in one class into a single announcement; dedupe so
a trip announces once per class. Without batching, 30 arrivals across a 90-minute
dismissal means an announcement every ~30 seconds in every room — unusable.
- **Depends on:** M4.3, M6.2

### M6.4 — Classroom display
**Built as a web route in `admin-web` (`/display/[classId]`), run in kiosk mode
on the tablet — not as a React Native screen.** Deployment is opening a URL
rather than installing and pairing an APK; GSAP and the Web Audio API are both
available; and this is the most animation-heavy surface in the product. Uses the
ink-inverted high-contrast variant for across-the-room legibility.

Shows the class's live queue, plays the stitched announcement, and animates the
arriving child's name.
- **Depends on:** M6.1, M6.3, M5.2

### M6.5 — Device health monitor
"Prep A display offline 6 minutes" on the admin dashboard.

**A dead tablet fails silently** — no buzz, no voice, and nothing indicating
anything is wrong. Unlike QR verification, announcements have **no offline
path**: the ETA trigger is computed server-side and pushed. Classroom wifi is
now a deployment dependency, and the teacher's phone screen is the only fallback.
- **Depends on:** M6.2

---

# Phase 7 — QR Verification

The safety core. Phase 2.5 already guarantees a working handover, so nothing
here is load-bearing for the demo — it is load-bearing for the *pitch*.

### M7.1 — Token signing service
Per-school ES256 keypair, `POST /qr-tokens/batch`, public key distribution.

**Raise the batch size.** 20 tokens × 60s ≈ 20 minutes of coverage, but a trip
can run 90 minutes — a collector waiting 25 minutes at the gate runs out of
valid codes, in exactly the offline scenario this was designed for. Size the
batch to the trip window, or refetch opportunistically.
- **Depends on:** M4.1

### M7.2 — Collector QR display
Rotating ~60s, batch pre-fetched at trip start so it works with no signal.
Parents, relatives, and drivers all display one. A driver's token carries
children from several families.
- **Depends on:** M7.1

### M7.3 — Guard scanner + offline verification
Signature against cached public key → `exp` not passed (90s window, ±60s skew) →
`jti` unused today on this device → child on today's roster and staged → show
child photo + collector photo → guard confirms visually → tap Confirm.
**Never a synchronous server call. The gate never blocks on the network.**
- **Depends on:** M7.2, M2.4

### M7.4 — Van multi-child handover
One scan, then the guard confirms each child individually as they board — a
partial handover state the parent flow never has. A van of 12 at ~5s each is a
minute-plus in the shared lane, so this screen's speed directly determines
whether the queue backs up.
- **Depends on:** M7.3

### M7.5 — Offline handover sync
Queue locally, sync on reconnect, idempotent by `jti`.
- **Depends on:** M7.3, M2.5

---

# Phase 8 — Push Notifications

### M8.1 — FCM registration
`users.fcm_token` exists in the schema but nothing can set it — **push cannot
work at all until this ships.**
- **Depends on:** M1.2

### M8.2 — Parent notifications
Pickup reminder, geofence arrival, handover complete. Explicit consent; handle
denial gracefully. **No teacher arrival push — voice replaces it.** No SMS.
- **Depends on:** M8.1, M4.4

---

# Phase 9 — Tier 2 & Release

### M9.1 — One-time pass
Now nearly free: `kind = one_time` on `pickup_authorizations` with an expiry.
The original design had this as a separate table and a separate build.
- **Depends on:** M2.3

### M9.2 — Urdu QA + RTL pass ⭐ NEVER CUT
Every screen, both languages, RTL mirroring verified on a real device.
- **Depends on:** all UI modules

### M9.3 — Broadcast announcements · **M9.4 — Analytics**
First to cut if time runs short.

### M9.5 — Release
Signed APKs via EAS, Play closed testing, download page, video tutorials for
parent / teacher / guard / driver flows, demo dataset, end-to-end gate run with
5+ phones.

---

# Cut order

Scope grew by roughly two days (drivers ≈ 1, voice ≈ 1) against a Tier 1 list
that was already 12 modules in 7 days. Something has to give.

**Cut in this order:** M9.4 analytics → M9.3 announcements → M5.5 admin live
monitor → M4.5 map view (queue position as text is enough).

**Never cut:** M2.5 manual fallback · the audit log · M9.2 Urdu.

The one-time delegate pass is no longer on the cut list — standing
authorizations absorbed it.

---

# Critical path

```
M0.3 contract ──▶ M1.1 schema ──▶ M1.2 auth ──▶ M2.x authorization
                                                      │
                          ┌───────────────────────────┼──────────────────┐
                          ▼                           ▼                  ▼
                   M2.5 handover              M3 schedules         M8.1 FCM reg
                   (never-cut, done early)          │
                                                    ▼
                                             M4 tracking + ETA
                                                    │
                                    ┌───────────────┴───────────────┐
                                    ▼                               ▼
                              M5 queue ──────────────────▶ M6 voice announcements
                                    │
                                    ▼
                              M7 QR verification
```

**M0.3 blocks everything.** **M4.3 (ETA) feeds both the queue and the voice
trigger** — it is the single busiest dependency in the project and deserves the
most test coverage.
