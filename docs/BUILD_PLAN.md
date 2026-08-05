# Build Plan — 7 Days

Person A: backend, database, admin web, infrastructure.
Person B: both mobile apps, shared package, localization.

Check items off as you go — this file is the single source of truth for "are we on track," not something either of you needs to keep in your head.

## Day 0 — Prep

**Both**
- [ ] Repo cloned, monorepo scaffold in place
- [ ] API contract agreed in `docs/api/openapi.yaml`
- [ ] Play Console account registered — identity verification takes days, start now

**Person A**
- [ ] AWS account created
- [ ] EC2 instance up
- [ ] Postgres, Redis, Caddy installed and running natively
- [ ] Domain/subdomain pointed at the instance

**Person B**
- [ ] Expo dev builds running on both physical phones
- [ ] FCM project configured

## Day 1 — Foundations

**Person A**
- [ ] Full schema + first Alembic migration
- [ ] Auth endpoints, JWT, role guards
- [ ] Seed script run: 1 school, 3 classes, 30 students, 40 guardians

**Person B**
- [ ] App shells, navigation, role routing (both apps)
- [ ] Login screens (both apps)
- [ ] i18n scaffolded, Urdu strings started

## Day 2 — Schedules & requests

**Person A**
- [ ] Schedule CRUD
- [ ] Nightly job generating tomorrow's `pickup_requests`
- [ ] Queue read endpoint

**Person B**
- [ ] Parent: schedule setup + today's exception UI
- [ ] Teacher: today's class list

## Day 3 — Live tracking

**Person A**
- [ ] Location ingest endpoint, Redis cache
- [ ] Haversine + ETA calculation
- [ ] Geofence evaluation + FCM dispatch
- [ ] First build uploaded to Play closed testing track

**Person B**
- [ ] Parent: "On my way", `watchPositionAsync`, map view
- [ ] Teacher: push handling, live queue screen

## Day 4 — Realtime queue

**Person A**
- [ ] WebSocket queue broadcast
- [ ] State machine transitions implemented
- [ ] Admin: live queue monitor page

**Person B**
- [ ] Live queue with reorder animation
- [ ] Parent: "you are #3, ~6 minutes"
- [ ] Teacher: mark staged

## Day 5 — Verification

**Person A**
- [ ] Token batch signing endpoint, public key distribution
- [ ] Handover endpoint + audit log
- [ ] Offline handover sync endpoint

**Person B**
- [ ] Parent: rotating QR display
- [ ] Guard: scanner, offline verify, photo confirm
- [ ] Guard: manual fallback flow

## Day 6 — Admin, polish, Tier 2

**Person A**
- [ ] Admin CRUD complete
- [ ] Analytics queries + charts
- [ ] Announcement broadcast

**Person B**
- [ ] Delegate pass UI
- [ ] Announcements screen
- [ ] Urdu QA pass — every screen

## Day 7 — Harden & present

**Both**
- [ ] End-to-end run at a real gate, 5+ phones simultaneously
- [ ] Signed release APKs, hosted download page, install instructions
- [ ] Video tutorials: parent, teacher, guard flows
- [ ] Presentation deck + live demo script
- [ ] Demo dataset seeded and verified

## If Day 5 slips

Cut in this order: analytics → announcements → delegate pass → live map view (queue position as text is enough).

**Never cut:** manual fallback, Urdu, audit log.
