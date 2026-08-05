# Smart School Pickup & Queue Management System
### Project Plan — MVP Build (1 Week)

> **Status:** Planning complete, build not started
> **Team:** 2 developers
> **Product name:** TBD
> **Target:** Montessori / primary schools in Pakistan

---

## 1. Problem

Montessori schools in Pakistan face four recurring problems during the 1:00–2:30 PM dismissal window:

| Problem | Current state | Consequence |
|---|---|---|
| **Traffic congestion** | All parents arrive simultaneously | 15–20 min average wait; safety hazard outside the gate |
| **Weak authorization** | Paper logs, staff memory, verbal confirmation | Unauthorized pickup is possible and unauditable |
| **No communication channel** | Phone calls to the office | Staff overloaded; parents uninformed |
| **No audit trail** | Incomplete paper records | Incidents cannot be investigated |

**Our thesis:** if the school knows *who is arriving, when, and in what order*, children can be staged at the gate **before** the parent arrives — turning a 15-minute queue into a 30-second handover.

---

## 2. Surfaces & Roles

Three deliverables, four roles.

### 2.1 Parent App (Android)
- Set a recurring weekly pickup schedule
- Override for today ("my brother is coming at 2 PM", "absent today")
- Issue a **one-time delegate pass** to a relative or driver
- Tap **"On my way"** → live tracking begins
- See own live queue position and estimated handover time
- Display rotating QR at the gate
- Receive reminders and school announcements

### 2.2 Staff App (Android) — *one app, two roles*

This is a single codebase with role-based screens. The guard never sees the teacher UI and vice versa.

| Role | Sees |
|---|---|
| **Teacher** | Live queue for their class only. Push notification when a parent crosses the 1km ring. Prep list: "Bring Ali, Sara, Hamza to the gate." Marks a child as *staged at gate*. |
| **Guard** | Scanner screen only. Scan QR → green/red verdict with child photo + guardian photo. Manual fallback search. Confirms handover. |

> **Design note:** The original plan had teachers scanning QRs. That was wrong — teachers cannot stand at the gate. Splitting verification (guard) from staging (teacher) is what makes the system actually deployable.

### 2.3 Admin Web Dashboard (AWS)
- CRUD: schools, classes, students, guardians, staff
- Guardian authorization records (who may collect whom)
- Live queue monitor across all classes
- Broadcast announcements
- Analytics: average wait time, on-time %, peak-minute distribution
- Full audit log of every handover

---

## 3. Core Flow

```
  PARENT                    SERVER                   TEACHER            GUARD
    │                          │                        │                 │
    │  Recurring schedule      │                        │                 │
    │  (set once)              │                        │                 │
    │─────────────────────────▶│                        │                 │
    │                          │                        │                 │
    │            [ 12:15 PM — reminder push ]            │                 │
    │◀─────────────────────────│                        │                 │
    │                          │                        │                 │
    │  Tap "On my way"         │                        │                 │
    │─────────────────────────▶│                        │                 │
    │                          │                        │                 │
    │  location every 15s      │  compute distance      │                 │
    │═════════════════════════▶│  + ETA                 │                 │
    │                          │                        │                 │
    │                          │  distance < 1000m ?    │                 │
    │                          │       │                │                 │
    │                          │       └── YES ────────▶│  "Ali's parent  │
    │                          │                        │   ~4 min away"  │
    │                          │                        │                 │
    │                          │◀───────────────────────│  Mark staged    │
    │                          │                        │                 │
    │  QR (rotating, 90s)      │                        │                 │
    │  ───────────────────────────────────────────────────────────────▶  │
    │                          │                        │                 │
    │                          │                        │      verify     │
    │                          │                        │      offline    │
    │                          │◀────────────────────────────────────────│
    │                          │   handover logged      │                 │
    │◀─────────────────────────│───────────────────────▶│                 │
    │  "Handover complete"     │                        │  remove from    │
    │                          │                        │  queue          │
```

### 3.1 Queue state machine

```
SCHEDULED ──▶ EN_ROUTE ──▶ NEARBY ──▶ AT_GATE ──▶ HANDED_OVER
    │             │                                     ▲
    │             └── (cancelled) ──────────────────────┘
    │
    └── (no trip started by slot + grace) ──▶ LAPSED
```

**Critical design decision:** booking time determines the *prep list*, not the *queue order*.

Queue order is computed from live ETA among `EN_ROUTE` and `NEARBY` parents. This means:

- A parent who books 1:00 PM but leaves at 1:30 PM automatically falls behind — no punitive "send to back of queue" logic required
- A parent who arrives early is served early if a slot is free
- `LAPSED` entries simply re-enter as `EN_ROUTE` whenever the parent finally starts the trip

This is simpler to build *and* fairer than an explicit penalty system.

### 3.2 ETA calculation

**Do not use the Google Routes API.** Use haversine distance ÷ rolling average speed, computed server-side. It is free, accurate enough for ordering a queue, and removes a paid dependency from the hot path.

Maps API is used **only** to render the map view. Nothing else.

---

## 4. Module Scope

### Tier 1 — Must ship in week 1 (demo-critical)

| # | Module | Notes |
|---|---|---|
| 1 | Auth & role system | Parent / Teacher / Guard / Admin |
| 2 | School, class, student, guardian data model | Admin-managed |
| 3 | Recurring schedule + daily exception | **Not** daily re-booking — see §4.1 |
| 4 | "On my way" + live location stream | Foreground only |
| 5 | Server-side 1km geofence + teacher push | |
| 6 | Live queue (staff app + admin web) | WebSocket |
| 7 | Rotating signed QR + guard scan | Offline-verifiable — see §6 |
| 8 | Manual fallback handover | **Non-negotiable** — see §6.3 |
| 9 | Handover confirmation + audit log | |
| 10 | Push notifications (FCM) | Reminders, arrival, completion |
| 11 | Urdu / English localization | |
| 12 | Admin CRUD dashboard | |

### Tier 2 — Ship if time remains, else week 2

| # | Module | Notes |
|---|---|---|
| 13 | Delegated one-time pickup pass | Highest-value differentiator |
| 14 | Sibling grouping | **Model in DB from day 1**, UI can wait |
| 15 | Broadcast announcements | ~3 hours of work |
| 16 | Analytics page | Avg wait, on-time %, peak heatmap |
| 17 | Absence / early-leave request | |

### Deferred — explicitly out of scope
In-app chat · fee management · attendance management · van/driver tracking · iOS · multi-school tenancy beyond basic `school_id` scoping

### 4.1 Why recurring schedules, not daily booking

Requiring parents to open the app every evening to book tomorrow is friction that kills adoption. Instead:

- Parent sets a weekly default **once** (Mon–Fri, 1:15 PM, primary guardian)
- System auto-generates tomorrow's `pickup_request` rows at midnight via a scheduled job
- Parent only opens the app to make an **exception**

Same data model, dramatically better retention, and a stronger story for judges.

---

## 5. Technical Stack

Chosen for: speed of build, zero recurring cost, and alignment with the team's existing strengths.

### Backend
```
FastAPI (Python)          — REST + WebSocket in one process
PostgreSQL 16             — primary datastore
Redis                     — live location cache, WebSocket pub/sub, job broker
SQLAlchemy 2.0 + Alembic  — ORM + migrations
APScheduler               — nightly request generation, reminder jobs
Pydantic v2               — validation
python-jose               — QR token signing (ES256)
```

**Why not Celery:** APScheduler is sufficient for two scheduled job types and saves a worker process on a small EC2 box.

### Mobile (both apps)
```
React Native + Expo (dev build)
expo-location             — foreground position stream
expo-camera               — QR scan (guard role)
expo-notifications        — FCM wrapper
react-native-qrcode-svg   — QR rendering (parent)
react-native-maps         — map view
i18next                   — Urdu / English
zustand                   — state
```

Two separate apps, **one shared package** for API client, types, i18n strings, and design tokens. Monorepo with pnpm workspaces.

### Admin Web
```
Next.js 16 (App Router) + React 19 + TypeScript
Tailwind + shadcn/ui
TanStack Query
Recharts (analytics)
```

### Infrastructure
```
1 × EC2 t3.small (or t4g.small — ARM is cheaper)
PostgreSQL + Redis         — installed directly on the instance (apt), no containers
FastAPI (via systemd + Uvicorn/Gunicorn) and Next.js (via systemd + PM2/Node) run natively
Caddy                      — reverse proxy, automatic HTTPS, zero config
Subdomain of tehmandev.com
GitHub Actions             — build + deploy on push to main (rsync/SSH, not image push)
S3                         — student/guardian photos
```

**Deliberately avoided:** RDS, ALB, NAT Gateway, ECS, and Docker. Docker adds a layer of indirection (image builds, container networking, volume management) that isn't needed for one service per role on one box — installing Postgres, Redis, and the two app runtimes directly with systemd is faster to set up in week one and easier for both of you to debug directly on the server. One box, native services, done.

### 5.1 Architecture

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Parent App  │   │  Staff App   │   │  Admin Web   │
│  (Android)   │   │  (Android)   │   │  (browser)   │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       │   HTTPS + WSS    │                  │
       └──────────────────┼──────────────────┘
                          ▼
                  ┌───────────────┐
                  │     Caddy     │  auto-TLS
                  └───────┬───────┘
                          │
              ┌───────────┴────────────┐
              ▼                        ▼
        ┌───────────┐           ┌────────────┐
        │  FastAPI  │           │  Next.js   │
        │  REST+WS  │           │   admin    │
        └─────┬─────┘           └────────────┘
              │
      ┌───────┼───────┐
      ▼       ▼       ▼
  ┌──────┐ ┌─────┐ ┌─────┐
  │ PG   │ │Redis│ │ S3  │
  └──────┘ └─────┘ └─────┘
              │
              ▼
        ┌──────────┐
        │   FCM    │  push
        └──────────┘
```

---

## 6. Security Design

This is a **child safety system**. The security model is the project, not a feature of it.

### 6.1 QR token — rotating, signed, offline-verifiable

A static QR code can be screenshotted and forwarded to anyone. That defeats the entire premise. Instead:

**Parent app generates a fresh token every 60 seconds:**

```json
{
  "rq":  "pickup_request_uuid",
  "sid": ["student_uuid_1", "student_uuid_2"],
  "gid": "guardian_uuid",
  "sch": "school_uuid",
  "iat": 1754400000,
  "exp": 1754400090,
  "jti": "nonce"
}
```

- Signed **ES256** with the school's private key (held server-side)
- Parent app pre-fetches a batch of ~20 tokens when the trip starts, so it works with no signal at the gate
- Guard app holds only the **public key** + today's roster, cached locally

**Guard app verifies fully offline:**
1. Signature valid against cached school public key
2. `exp` not passed (90s window, ±60s clock skew tolerance)
3. `jti` not already used on this device today
4. Student is on today's roster and marked staged
5. → Display child photo + guardian photo → guard confirms visually → tap **Confirm**

Handover is queued locally and synced when connectivity returns. **The gate never blocks on the network.**

### 6.2 Location privacy

| Rule | Rationale |
|---|---|
| **No background location permission at all** | Avoids a Play Store review that routinely takes weeks and often fails |
| Tracking starts only on explicit "On my way" tap | Consent is an action, not a checkbox |
| Tracking auto-stops on handover or after 90 min | No forgotten sessions |
| Teachers see **only** their own class's parents, **only** during an active trip | A teacher browsing every parent's location all day is both a privacy failure and a demo liability |
| Raw location history purged after 24h; only `entered_geofence_at` and `arrived_at` retained | Minimises stored PII |

Android permissions requested: `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`, `CAMERA` (guard role only).

> **Week-1 simplification:** location streams via `watchPositionAsync` while the app is open. Post-competition, upgrade to a proper foreground service with a persistent notification so it survives backgrounding. That upgrade will require a `FOREGROUND_SERVICE_LOCATION` declaration on Play.

### 6.3 Manual fallback — mandatory

Dead phone. Cracked camera. No signal. A grandmother who has never used an app.

**Software must never block a real child handover.** The guard app must always offer:

```
Search student by name
  → show authorized guardian list with photos
  → guard selects who is present
  → select reason: [phone dead] [no app] [scan failed] [other]
  → confirm → logged as method=MANUAL with guard identity + timestamp
```

Manual handovers appear flagged on the admin dashboard for review. This is a **strength** to present, not a weakness to hide — it demonstrates the system was designed for the real gate, not the demo.

### 6.4 Play Store policy

⚠️ **Do not declare either app as targeting children.** Users are adults — parents, teachers, guards. Declaring a child audience triggers Google's Families Policy, which is far stricter and would block launch.

---

## 7. Data Model (core tables)

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
                    -- status: see §3.1 state machine

trips              (id, guardian_id, date, started_at, last_lat, last_lng,
                    eta_seconds, entered_geofence_at, arrived_at)
                    -- ONE trip covers ALL of a guardian's pickup_requests
                    -- this is how sibling grouping works

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

**Sibling grouping note:** one `trip` → many `pickup_requests`. The trip only completes when every child is handed over. Getting this relationship right on day 1 costs nothing; retrofitting it later means rewriting the queue logic. Build the schema this way even if the UI ships in week 2.

---

## 8. One-Week Build Plan

**Person A** — backend, database, admin web, infrastructure
**Person B** — both mobile apps, shared package, i18n

### Day 0 (prep — do before the clock starts)
- Both: repo setup, monorepo scaffold, agree API contract in OpenAPI
- A: AWS account created, EC2 up, Postgres/Redis/Caddy installed and running, domain pointed
- B: Expo dev builds running on both physical phones, FCM project configured
- **Register Play Console account today** — identity verification takes days

### Day 1 — Foundations
| A | B |
|---|---|
| Full schema + Alembic migrations | App shells, navigation, role routing |
| Auth endpoints, JWT, role guards | Login screens both apps |
| Seed script: 1 school, 3 classes, 30 students, 40 guardians | i18n setup, Urdu strings scaffolded |

### Day 2 — Schedules & requests
| A | B |
|---|---|
| Schedule CRUD, nightly job generating tomorrow's requests | Parent: schedule setup + today's exception UI |
| Queue read endpoint | Teacher: today's class list |

### Day 3 — Live tracking
| A | B |
|---|---|
| Location ingest endpoint, Redis cache, haversine + ETA | Parent: "On my way", `watchPositionAsync`, map view |
| Geofence evaluation + FCM dispatch | Teacher: push handling, live queue screen |
| **Upload first build to Play closed testing track** | |

### Day 4 — Queue & realtime
| A | B |
|---|---|
| WebSocket queue broadcast | Live queue with reorder animation |
| State machine transitions | Parent: "you are #3, ~6 minutes" |
| Admin: live queue monitor page | Teacher: mark staged |

### Day 5 — Verification
| A | B |
|---|---|
| Token batch signing endpoint, public key distribution | Parent: rotating QR display |
| Handover endpoint + audit log | Guard: scanner, offline verify, photo confirm |
| Sync endpoint for offline handovers | Guard: **manual fallback flow** |

### Day 6 — Admin, polish, Tier 2
| A | B |
|---|---|
| Admin CRUD complete | Delegate pass UI |
| Analytics queries + charts | Announcements screen |
| Announcement broadcast | Urdu QA pass — every screen |

### Day 7 — Harden & present
- Both: end-to-end run at a real gate with 5+ phones simultaneously
- Signed release APKs, hosted download page, install instructions
- Video tutorials: parent flow, teacher flow, guard flow
- Presentation deck + live demo script
- Seed a realistic demo dataset

### Buffer strategy
If Day 5 slips, cut in this order: **analytics → announcements → delegate pass → live map view** (queue position as text is enough). Never cut: manual fallback, Urdu, or the audit log.

---

## 9. Cost Breakdown

| Item | Cost | Notes |
|---|---|---|
| Play Console (personal account) | **$25 one-time** | Covers both apps. Identity verification required — start now |
| AWS | **$0** for 6 months | $100 credits at signup + up to $100 more from onboarding tasks. Free plan expires at 6 months **or** when credits run out, whichever is first — then 90 days to upgrade before the account is deleted |
| Google Maps SDK | **$0** at MVP volume | ⚠️ The old flat $200/month credit was **retired in March 2025**. Now each SKU has its own free monthly allowance and they no longer pool. We only touch the Maps SDK — no Routes, no Places, no Geocoding |
| Firebase Cloud Messaging | **$0** | Unlimited |
| Domain | **$0** | Subdomain of an existing domain |
| SSL | **$0** | Caddy + Let's Encrypt |
| APK hosting | **$0** | S3 static site or GitHub Releases |
| **Total** | **~$25** | |

### Cost traps to avoid
- **NAT Gateway** — ~$32/month for nothing. Never provision one.
- **Application Load Balancer** — ~$16/month. Caddy on the same box does the job.
- **RDS** — install Postgres directly on the EC2 instance instead.
- **Idle Elastic IPs** — billed when unattached.
- **CloudWatch Logs** — default retention is *forever*. Set 7-day retention on day 1.
- **A Google Maps billing account requires a valid international card.** Sort this out on day 0, not day 3.
- Set an **AWS Budget alert at $20** before writing any code.

---

## 10. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Play production access blocked by 12-tester/14-day rule | **Certain** | Direct APK download + video tutorials is the competition plan. Start the closed test on Day 3 so production unlocks ~2 weeks out |
| Location tracking dies when app is backgrounded | High | Week-1: keep app open during trip. Accept it, document it, upgrade after |
| No signal at the gate | High | Offline QR verification + local handover queue with later sync |
| 30 devices scanning at once overwhelms the guard | Medium | One guard, ~5s per handover = ~12/min. Staging by teachers is what makes this work |
| Urdu retrofit at the end | Medium | i18n from Day 1, translate as you build, never after |
| Scope creep past Tier 1 | High | Buffer strategy in §8 is agreed in advance, not negotiated mid-week |
| Teacher personal phones vary wildly | Medium | Test on the oldest cheap Android device you can find, not a flagship |

---

## 11. Open Decisions

1. **Pilot school** — is there a real school willing to give us a real roster and let us test at an actual gate? Even one classroom transforms the demo from a simulation into a deployment.
2. **Urdu scope** — full Urdu across all three surfaces, or parent app only? (Teachers and guards may prefer Urdu too; admin dashboard is arguably English-only.)
3. **Person A / Person B assignment** — who takes which side?
4. **Competition deliverable** — does it require a live deployed system, or is a recorded demo acceptable? This determines how much of Day 7 goes to hardening vs. video production.
5. **Parent onboarding** — how does a parent get an account? Proposal: admin creates it, parent receives an invite code, sets a password on first login. No SMS, no OTP cost.
6. **Product name.**

---

## Appendix — Why this design will score well

- **It solves the real constraint, not the imagined one.** Teachers cannot stand at the gate; the guard/teacher split reflects how schools actually operate.
- **It works when the network doesn't.** Offline QR verification is the difference between a demo and a system.
- **It degrades safely.** Manual fallback means the software never stands between a parent and their child.
- **It respects privacy by design.** No background tracking, scoped visibility, 24-hour data retention — all defensible in one sentence each.
- **It is measurable.** Average wait time before vs. after is a number we can put on a slide.
