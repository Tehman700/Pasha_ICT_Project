# CLAUDE.md — apps/parent-app, apps/staff-app

Both mobile apps. Same stack, same conventions — this file covers both (Claude Code sessions opened inside either subfolder pick this up via the directory tree).

## Before starting

Read (from repo root): `docs/PROJECT_CONTEXT.md`, `docs/api/openapi.yaml`, `docs/SECURITY.md`.

## Stack

React Native + Expo. State: zustand. Navigation: pick one approach (expo-router or React Navigation) and use it consistently across both apps. i18n: i18next, English + Urdu from the first screen, not retrofitted.

## Shared package

`packages/shared` holds the API client, TypeScript types (mirroring `docs/api/openapi.yaml`), i18n strings, and design tokens. Both apps import from it — don't duplicate an API call or a translated string that already exists there. If a type doesn't exist yet for an endpoint you're using, add it to `shared` rather than inlining it locally.

## staff-app specifically: two roles, one app

Teacher and guard are different screens behind the same login, routed by `user.role` from `/users/me`. Do not build these as separate apps — a guard should never see teacher screens and vice versa, but they share auth, the shared package, and the build pipeline.

- **Teacher**: live queue for their class, geofence-arrival notifications, prep list, "mark staged."
- **Guard**: scanner only, offline QR verification, manual fallback flow. See `docs/SECURITY.md` for exactly how offline verification must work — don't simplify this to an online-only check, the gate cannot depend on signal.

## Location — read this before touching expo-location

- Foreground only. `watchPositionAsync`, started only after the user taps "On my way," stopped on handover or after 90 minutes.
- Do **not** request background location permission or use `expo-task-manager` background tasks for this. See `docs/SECURITY.md` for why — it's a deliberate constraint, not an oversight to "fix."

## QR

- Parent app **displays** a rotating QR (~60s), pre-fetching a batch of signed tokens from `/qr-tokens/batch` when the trip starts so it still works with no signal.
- Guard app **scans and verifies offline** against a cached public key — never call the server synchronously to verify a scan.

## Notifications

expo-notifications wrapping FCM. Request permission explicitly, and handle the "denied" case gracefully — don't assume it's granted.

## Localization

Every new string ships in both `en` and `ur` in the same commit — see `docs/PROJECT_CONTEXT.md`, this is a Tier 1 requirement, not a polish pass.

## Running locally

```bash
cd apps/parent-app   # or staff-app
npx expo start
```
