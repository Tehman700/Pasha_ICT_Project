# CLAUDE.md — apps/admin-web

Next.js admin dashboard. Owned by Person A.

## Before starting

Read (from repo root): `docs/PROJECT_CONTEXT.md`, `docs/api/openapi.yaml`.

## Stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, TanStack Query, GSAP for animation, Recharts for analytics.

Tailwind v4 is **CSS-first** — there is no `tailwind.config.ts`. Tokens live in
`@theme` inside `app/globals.css`, mirroring `packages/shared/src/tokens/`.
Change both in the same commit.

shadcn/ui is not installed. The component library in `components/ui/` is written
directly against `design.md` — shadcn's defaults (shadows, elevation tiers,
neutral greys) contradict the hairline-only, warm-cream system.

This app also hosts the **classroom display** at `/display/[classId]` — a
kiosk-mode route for the wall-mounted tablet, not a React Native screen. See
module M6.4 in `docs/MODULE_PLAN.md` for why.

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
- Open decision #2 resolved: this app is fully bilingual — `lib/locale.tsx` provides the toggle and RTL flip, every screen reads strings from `@pickup/shared`. Treat Urdu here exactly like the two mobile apps: new user-facing copy ships in both languages in the same commit.

## Running locally

```bash
cd apps/admin-web
npm run dev
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
