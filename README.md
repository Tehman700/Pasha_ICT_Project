# Smart School Pickup & Queue Management System

MVP for a competition build: a queue and verification system for Montessori/primary school dismissal, built as two Android apps and one admin web dashboard on a shared FastAPI backend.

**Team:** 2 developers · **Timeline:** 1 week · **Product name:** TBD

## Start here

New to this repo? Read in this order:
1. [`START_HERE.md`](./START_HERE.md) — 5-minute orientation
2. [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md) — what we're building and why
3. [`docs/BUILD_PLAN.md`](./docs/BUILD_PLAN.md) — the day-by-day checklist
4. [`CLAUDE.md`](./CLAUDE.md) — rules for any Claude Code session in this repo

Full detail (problem statement, security design, risk register) lives in [`docs/SYSTEM_PLAN.md`](./docs/SYSTEM_PLAN.md).

## Repo structure

```
school-pickup-system/
├── backend/              FastAPI — REST + WebSocket (Person A)
├── apps/
│   ├── parent-app/       React Native / Expo (Person B) — not yet scaffolded
│   ├── staff-app/        React Native / Expo — teacher + guard roles (Person B) — not yet scaffolded
│   └── admin-web/        Next.js admin dashboard (Person A)
├── packages/
│   └── shared/           API client, types, i18n strings — shared by both mobile apps
├── docs/                 Everything about what/why/how
├── scripts/
│   └── seed.py           Demo data generator
└── .github/workflows/    Deploy on push
```

`parent-app` and `staff-app` aren't scaffolded yet — create them with Expo's own CLI on Day 0/1 so dependency versions stay current, rather than hand-rolling boilerplate here. `apps/CLAUDE.md` already covers conventions for both once they exist.

## Day 0 setup

**Both**
```bash
git clone <repo-url>
cd school-pickup-system
cp .env.example .env   # fill in real values once you have them — never commit .env
```

**Person A — backend + infra**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# backend/CLAUDE.md is already here — Claude Code picks it up automatically

cd ../apps
npx create-next-app@latest admin-web --typescript --tailwind --app
# If the CLI refuses because the folder isn't empty (it only has CLAUDE.md),
# move CLAUDE.md out, scaffold, then move it back in.
```
Then follow [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) to bring up the EC2 box.

**Person B — mobile**
```bash
cd apps
npx create-expo-app@latest parent-app
npx create-expo-app@latest staff-app

cd ../packages/shared
pnpm init
```

## API contract

[`docs/api/openapi.yaml`](./docs/api/openapi.yaml) is the source of truth between backend and mobile/web. Agree changes to it before implementing — this is what lets both of you build in parallel without blocking on each other.

## Collaboration & deployment

See [`docs/COLLABORATION.md`](./docs/COLLABORATION.md) and [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the full detail — git workflow, shared dev database, secrets handling, and how the EC2 box is set up.
