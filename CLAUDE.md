# CLAUDE.md — Repo Root

**Rukhsat (رخصت)** — a school pickup queue and verification system: two Android
apps (parent, staff) and one admin web dashboard, on a shared FastAPI backend.
A 1-week competition build by two developers, both using Claude Code.

The competition requires a **live deployed system**, not a recorded demo.

**All 44 modules are built and deployed.** For the backend and the admin web
dashboard, what remains is testing and a store submission — not construction.
Don't propose new modules or "finish" existing ones without checking
`docs/HANDOVER.md` first.

**The mobile apps are the exception**, and the plan changed on 21 Aug 2026.

The **React Native apps are the product**. They are complete, live, and are
what ships. The remaining mobile work is a **restyle**: bringing the visual
language of the Compose scaffold's onboarding flow into the RN apps, screen by
screen. It is not a rebuild — no module is being built again.

The native Android rebuild in `apps/mobile-android/` is **parked**. Phase 0 was
finished (toolchain, palette, brand mark, dependencies, Gate 0 passed) and work
stopped there. It is kept because it cost nothing to keep and is the fallback
if RN tooling becomes painful again. **Do not resume it without being asked.**

Why the change: the RN apps already carry the same `#f54e00` / `#f7f7f4` /
`#26251e` tokens and a full component system, and every one of their screens
already works against the live backend. The native path was 54 steps from that
starting line. Restyling is JS-only — Metro hot-reloads in a second and
`eas update` reaches a real phone in a minute — which sidesteps the EAS Build
and fingerprint problems that motivated the rebuild in the first place.

**Before making non-trivial changes, read:**
- `docs/mobile-v2/HANDOVER.md` — the native rebuild, now **parked**; read it before touching `apps/mobile-android/`
- `docs/HANDOVER.md` — current state of backend + admin web, build commands
- `docs/MODULE_PLAN.md` — the build order and what's done
- `docs/PROJECT_CONTEXT.md` — what's being built and every decision made so far
- `docs/api/openapi.yaml` — the contract between backend and all frontends
- `docs/SECURITY.md` — rules that must not be silently changed
- `docs/DESIGN_SYSTEM.md` + `design.md` — the visual system and its app-level extensions

## Constraints that must never be silently changed

If a task seems to require violating one of these, stop and flag it instead of quietly working around it.

- **No Docker in production.** Postgres, Redis, FastAPI, and Next.js run natively via systemd on one EC2 instance. See `docs/DEPLOYMENT.md`.
- **No background location permission**, anywhere. Tracking is foreground-only, and starts only on an explicit "On my way" tap.
- **QR codes rotate** (~60s, ES256-signed) and are **verified offline** by the guard app. Never make them static.
- **A collector never claims a child.** Only a parent grants access to their own
  children, or an admin does by phone with it logged and visible to the parent.
  There is **no student search endpoint for collectors** — not restricted, not
  paginated, none. The search itself is the leak: even a zero-result query
  confirms whether a child is enrolled.
- **The school vets nobody.** Drivers self-register and are invisible until a
  parent links them. Liability sits with the parent who granted access, not
  with the school.
- **The schedule is the backstop.** Geofences fire late or not at all — OEM
  battery managers on Xiaomi, Oppo, Vivo and Infinix are endemic in this
  market. The driver's own declared arrival time is what makes the system work
  on the days the clever thing fails.
- **Manual fallback is mandatory** in the guard app. Software must never be the reason a real handover can't happen.
- **No SMS.** Notifications only, via FCM, with explicit user consent.
- **The apps are English-only.** Decided 21 Aug 2026, reversing the earlier
  Urdu requirement. This applies to the native Android apps only — the live
  React Native apps and `apps/admin-web/` keep the Urdu they already ship, and
  their translations are not to be removed. Do not add Urdu to
  `apps/mobile-android/` or re-raise this; it was decided deliberately, with
  the trade-off understood.
- **Neither app is declared as targeting children** in Play Console — the users are the adults (parents, teachers, guards).

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, PostgreSQL, Redis, SQLAlchemy 2.0 + Alembic, APScheduler |
| Mobile (both apps) | **React Native + Expo** — the shipping apps |
| Mobile (parked) | Kotlin + Jetpack Compose in `apps/mobile-android/` — Phase 0 only, not in progress |
| Admin web | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, TanStack Query, GSAP |
| Infra | Single EC2 instance, native services, Caddy (TLS), GitHub Actions (deploy), EAS Build (APKs) |

## Repo structure

```
backend/            FastAPI — Person A
apps/mobile-android/  Kotlin + Compose — PARKED after Phase 0; not being worked on
apps/parent-app/    React Native — the shipping parent + collector app
apps/staff-app/     React Native — the shipping teacher + guard app
apps/admin-web/     Next.js — Person A
packages/shared/    API client, types, i18n — used by the two React Native apps
docs/mobile-v2/     The native rebuild: plan, architecture, design, verification
docs/               Context, plan, contract, security, deployment
scripts/seed.py     Demo data
```

## Coordination — two developers, one codebase

Two people work this repo, both using Claude Code. Work is **not** divided by
directory: whoever is free takes the next module in `docs/MODULE_PLAN.md`. Any
session may edit any file.

Two rules exist because they protect something real, not because of ownership:

1. **One Alembic lineage.** Generate migrations from `backend/` only, and only
   when you know no one else is mid-migration. Two people autogenerating
   revisions against the same tables produces a history that cannot be merged —
   the one failure here that costs a day to unpick.
2. **Announce contract changes before implementing them.** `docs/api/openapi.yaml`
   is what lets both people build in parallel without blocking. Changing it
   silently means the other person's code is built against a shape that no
   longer exists. Change the file, say so, then implement.

Everything else is ordinary collaboration: small frequent commits, and if you
touch something the other person is actively in, say so.

**Claude Code sessions:** never refuse or narrow a task because of a directory
boundary — there are none. The only thing to flag is a migration or contract
change, per the two rules above.

## Data model

Source of truth is `docs/DATA_MODEL.md`. If a migration needs to diverge from it, update that file in the same change.

## When docs and code disagree

The docs are wrong and need fixing in the same commit as the code — don't let them drift. A plan that's stale by Day 3 is how a 7-day build fails on Day 6.
