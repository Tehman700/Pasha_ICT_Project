# Start Here

This is the working repo for the school pickup queue system — one FastAPI backend, two Android apps (parent + staff), one admin dashboard, built in one week for the competition.

**All 44 modules are built.** The system is live at `api.tideover.site` and
`admin.tideover.site`. What is left is testing on real phones, not building.

## If you're picking this up mid-project

Read [`docs/HANDOVER.md`](./docs/HANDOVER.md) first — where things actually
stand, what was finished last, the bugs already hit and fixed, and the exact
commands to get a change onto a phone. Then
[`docs/MODULE_PLAN.md`](./docs/MODULE_PLAN.md) for module-by-module status.

To run the apps on a device: [`docs/RUNNING_ON_PHONES.md`](./docs/RUNNING_ON_PHONES.md).
To test them once running: [`docs/TEST_PLAN.md`](./docs/TEST_PLAN.md).

## If you're the project partner

1. Read [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md) — everything decided so far, in one place. Ten minutes, no skipping.
2. Read [`docs/HANDOVER.md`](./docs/HANDOVER.md) — current state and build commands.
3. Set up your half of the repo using the commands in [`README.md`](./README.md).
4. Anything that doesn't match what you remember agreeing — flag it before Day 1, not Day 5.

> `docs/BUILD_PLAN.md` is the original calendar view and its Person A / Person B
> columns are stale — tasks were never split by person. Use `MODULE_PLAN.md`
> for ordering and `HANDOVER.md` for status.

## If you're a supervisor or judge

The document written for an outside reader is [`docs/SYSTEM_PLAN.md`](./docs/SYSTEM_PLAN.md) — problem statement, architecture, security design, and the build timeline. Nothing else in this repo is written for that audience.

## If you're Claude Code

Read [`CLAUDE.md`](./CLAUDE.md) at the repo root first — it points to everything else you need and states the constraints that must never be silently changed (no Docker in production, no background location, rotating QR only, manual fallback is mandatory). `apps/CLAUDE.md`, `backend/CLAUDE.md`, `apps/admin-web/CLAUDE.md`, and `packages/shared/CLAUDE.md` cover conventions specific to each part of the codebase.

## The one rule for this week

If something in code contradicts something in `docs/`, the docs are out of date — fix the doc in the same commit as the code. A plan that's stale by Day 3 is how a 7-day build fails on Day 6.
