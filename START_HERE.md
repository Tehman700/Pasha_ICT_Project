# Start Here

This is the working repo for the school pickup queue system — one FastAPI backend, two Android apps (parent + staff), one admin dashboard, built in one week for the competition.

## If you're the project partner

1. Read [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md) — everything decided so far, in one place. Ten minutes, no skipping.
2. Read [`docs/BUILD_PLAN.md`](./docs/BUILD_PLAN.md) — what happens each day and who owns it.
3. Set up your half of the repo using the commands in [`README.md`](./README.md).
4. Anything that doesn't match what you remember agreeing — flag it before Day 1, not Day 5.

## If you're a supervisor or judge

The document written for an outside reader is [`docs/SYSTEM_PLAN.md`](./docs/SYSTEM_PLAN.md) — problem statement, architecture, security design, and the build timeline. Nothing else in this repo is written for that audience.

## If you're Claude Code

Read [`CLAUDE.md`](./CLAUDE.md) at the repo root first — it points to everything else you need and states the constraints that must never be silently changed (no Docker in production, no background location, rotating QR only, manual fallback is mandatory). `apps/CLAUDE.md`, `backend/CLAUDE.md`, `apps/admin-web/CLAUDE.md`, and `packages/shared/CLAUDE.md` cover conventions specific to each part of the codebase.

## The one rule for this week

If something in code contradicts something in `docs/`, the docs are out of date — fix the doc in the same commit as the code. A plan that's stale by Day 3 is how a 7-day build fails on Day 6.
