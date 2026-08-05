# CLAUDE.md — Repo Root

This is a 1-week competition build of a school pickup queue system: two Android apps (parent, staff) and one admin web dashboard, on a shared FastAPI backend. Two developers, both using Claude Code.

**Before making non-trivial changes, read:**
- `docs/PROJECT_CONTEXT.md` — what's being built and every decision made so far
- `docs/api/openapi.yaml` — the contract between backend and both frontends
- `docs/SECURITY.md` — rules that must not be silently changed
- `docs/BUILD_PLAN.md` — the current day's checklist

## Constraints that must never be silently changed

If a task seems to require violating one of these, stop and flag it instead of quietly working around it.

- **No Docker in production.** Postgres, Redis, FastAPI, and Next.js run natively via systemd on one EC2 instance. See `docs/DEPLOYMENT.md`.
- **No background location permission**, anywhere. Tracking is foreground-only, and starts only on an explicit "On my way" tap.
- **QR codes rotate** (~60s, ES256-signed) and are **verified offline** by the guard app. Never make them static.
- **Manual fallback is mandatory** in the guard app. Software must never be the reason a real handover can't happen.
- **No SMS.** Notifications only, via FCM, with explicit user consent.
- **Urdu is required**, not optional, alongside English — every new user-facing string needs both from the start.
- **Neither app is declared as targeting children** in Play Console — the users are the adults (parents, teachers, guards).

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, PostgreSQL, Redis, SQLAlchemy 2.0 + Alembic, APScheduler |
| Mobile (both apps) | React Native + Expo, shared package for API client / types / i18n |
| Admin web | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, TanStack Query |
| Infra | Single EC2 instance, native services, Caddy (TLS), GitHub Actions (deploy), EAS Build (APKs) |

## Repo structure

```
backend/            FastAPI — Person A
apps/parent-app/    React Native — Person B
apps/staff-app/     React Native — Person B (teacher + guard roles)
apps/admin-web/     Next.js — Person A
packages/shared/    API client, types, i18n — used by Person B's two apps
docs/               Context, plan, contract, security, deployment
scripts/seed.py     Demo data
```

## Ownership — respect these lines

- **Person A** owns `backend/`, `apps/admin-web/`, the schema, migrations, and infrastructure.
- **Person B** owns `apps/parent-app/`, `apps/staff-app/`, `packages/shared/`.

If you're working inside Person B's scope, treat `docs/api/openapi.yaml` as fixed. If a task genuinely needs a contract change, say so explicitly rather than quietly implementing a different shape than the doc states — the other person's code depends on the doc matching reality.

## Data model

Source of truth is `docs/DATA_MODEL.md`. If a migration needs to diverge from it, update that file in the same change.

## When docs and code disagree

The docs are wrong and need fixing in the same commit as the code — don't let them drift. A plan that's stale by Day 3 is how a 7-day build fails on Day 6.
