# Project Context

Everything decided about this project, in one place. If a Claude Code session or a new team member needs orientation, this is the file to read first — think of it as the project's memory.

## What we're building

A queue and verification system for school dismissal at Montessori/primary schools in Pakistan. Origin: a CEP report for CP-306 (Database Management Systems) on a Smart Student Pickup System, now being built for a team competition.

**Thesis:** if the school knows who is arriving, when, and in what order, children can be staged at the gate before the parent arrives.

## Team & constraints

- 2 developers, 1 week to build, plan to keep improving after the competition
- **Person A** — backend, database, admin web, infrastructure
- **Person B** — both mobile apps, shared package, localization
- Both will develop using Claude Code
- Product name: not decided yet

## The four problems this solves

| Problem | Current state | Consequence |
|---|---|---|
| Traffic congestion | All parents arrive simultaneously | 15–20 min average wait |
| Weak authorization | Paper logs, staff memory | Unauthorized pickup possible, unauditable |
| No communication channel | Phone calls to the office | Staff overloaded, parents uninformed |
| No audit trail | Incomplete paper records | Incidents can't be investigated |

## Surfaces & roles

Three deliverables, four roles:

- **Parent app** (Android) — recurring schedule, daily exceptions, delegate passes, "On my way," live queue position, rotating QR display, reminders
- **Staff app** (Android) — one app, two roles:
  - **Teacher** — live queue for their class, notified when a parent enters the 1km ring, prep list, marks a child staged
  - **Guard** — scanner only, verifies the QR, manual fallback, confirms handover
- **Admin web** (browser, AWS-hosted) — CRUD for schools/classes/students/guardians, live queue monitor, announcements, analytics, audit log

**Why the guard verifies, not the teacher:** teachers cannot stand at the gate — they're in classrooms or behind the gate line. Splitting verification (guard) from staging (teacher) is what makes this deployable, not just demoable.

## Key design decisions and why

- **Recurring schedule, not daily booking.** Parents set a weekly default once; a nightly job generates tomorrow's requests. Daily re-booking is friction that kills adoption.
- **Queue order comes from live ETA, not booking time.** Booking time only drives the teacher's prep list. A parent who's late for their slot simply doesn't hold a queue position — no punitive "back of the queue" logic needed.
- **ETA via haversine distance ÷ average speed, computed server-side** — not the Google Routes API. Free, accurate enough for queue ordering, no paid dependency in the hot path.
- **Geofence is evaluated server-side**, not via Android's on-device Geofencing API — this avoids the background-location permission entirely, which is a slow, failure-prone Play Store review path.
- **QR tokens rotate every ~60 seconds, ES256-signed, verified fully offline** by the guard app against a cached public key. A static QR can be screenshotted and forwarded — that defeats the entire premise.
- **Manual fallback is mandatory**, not optional. Dead phone, no signal, unregistered relative — software must never block a real handover. Logged and flagged for admin review.
- **One `trip` covers all of a guardian's children** (sibling grouping). The trip only completes when every child is handed over. This must be in the schema from day one — retrofitting it later means rewriting the queue logic.
- **No SMS.** Push notifications only (FCM), with explicit user consent for notification access.
- **Urdu is required**, alongside English, across the parent and staff apps from day one — not a post-launch add-on.
- **No background location permission anywhere.** Tracking starts only on an explicit "On my way" tap and stops on handover or after 90 minutes.
- **Local dev shares one Postgres/Redis instance** (Person A's EC2 box, IP-restricted), rather than each person running their own local database — removes version-drift risk between two machines on a 1-week clock.
- **No Docker in production.** Postgres, Redis, FastAPI, and Next.js all run natively via systemd on one EC2 instance. Docker's indirection (image builds, container networking) isn't worth it for one service per role on one box.

Full reasoning for each of these lives in [`SYSTEM_PLAN.md`](./SYSTEM_PLAN.md) if you need it — this file only states the decision.

## Module scope

**Tier 1 — must ship week one:** auth & roles · data model · recurring schedule + exceptions · live location + "On my way" · server-side geofence + push · live queue (WebSocket) · rotating signed QR + scan · manual fallback · handover + audit log · push notifications · Urdu/English · admin CRUD.

**Tier 2 — if time allows, else week two:** delegated one-time pickup pass · sibling grouping UI (schema ships in week 1 regardless) · broadcast announcements · analytics page · absence/early-leave request.

**Out of scope:** in-app chat, fee management, attendance management, van/driver tracking, iOS, multi-school tenancy beyond basic `school_id` scoping.

**If Day 5 slips, cut in this order:** analytics → announcements → delegate pass → live map view. **Never cut:** manual fallback, Urdu, audit log.

## Stack

FastAPI + PostgreSQL + Redis (backend) · React Native/Expo (both mobile apps, shared package) · Next.js (admin web) · single EC2 instance, native services, Caddy for TLS · GitHub Actions for deploy · EAS Build for APKs.

## Distribution plan

Play Store closed testing (started Day 3, so the 12-tester/14-day gate doesn't block the deadline) **plus** a direct APK download link **plus** video tutorials for parent/teacher/guard flows. The competition deliverable does not depend on reaching Play production.

⚠️ Neither app is declared as targeting children — users are adults (parents, teachers, guards). A children's-audience declaration triggers Google's much stricter Families Policy.

## Costs

~$25 total: Play Console one-time fee. AWS free plan credits ($100–200, 6-month window) cover infra. Google Maps SDK free tier covers MVP volume (the old $200/month pooled credit was retired in March 2025 — each SKU has its own free allowance now, and only the Maps SDK is used, not Routes/Places/Geocoding). Avoid NAT Gateway, ALB, RDS, and unbounded CloudWatch retention — see `DEPLOYMENT.md`.

## Open decisions

1. Is there a real pilot school for a live gate test?
2. Full Urdu across all three surfaces, or parent app only?
3. Which of you is Person A vs Person B, by name?
4. Does the competition require a live deployed system, or is a recorded demo acceptable?
5. Parent onboarding: admin creates the account, parent gets an invite code, sets password on first login — confirmed?
6. Product name.
