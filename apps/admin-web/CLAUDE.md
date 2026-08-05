# CLAUDE.md — apps/admin-web

Next.js admin dashboard. Owned by Person A.

## Before starting

Read (from repo root): `docs/PROJECT_CONTEXT.md`, `docs/api/openapi.yaml`.

## Stack

Next.js 14, App Router, TypeScript, Tailwind, shadcn/ui, TanStack Query, Recharts for analytics.

## Scope (Tier 1)

- CRUD: schools, classes, students, guardians, staff
- Guardian authorization records
- Live queue monitor across classes (consume the same WebSocket the staff app uses — see `docs/api/openapi.yaml`, `/ws/queue/{class_id}`)
- Audit log view

## Scope (Tier 2, if time allows)

- Broadcast announcements
- Analytics: average wait time, on-time %, peak-minute distribution

## Rules

- Every request matches `docs/api/openapi.yaml`. If a type doesn't exist for an endpoint, that's a signal the contract needs updating — flag it, don't invent an undocumented shape.
- This app is the one place Urdu is **not** required for MVP (see open decision #2 in `docs/PROJECT_CONTEXT.md` — confirm before assuming English-only is final).

## Running locally

```bash
cd apps/admin-web
npm run dev
```
