# CLAUDE.md — packages/shared

Shared by every surface — both mobile apps and `apps/admin-web`.

React Native components live in `packages/ui-native` instead, so `react-native` never leaks into the web build.

## What lives here

- API client (typed fetch wrapper, base URL from env)
- TypeScript types mirroring `docs/api/openapi.yaml` — keep these in sync manually for now; if the contract changes, update types here in the same change
- i18n strings (`en`, `ur`) — every user-facing string used by either app lives here, not inline in a screen component
- Design tokens (colors, spacing, type scale) shared across both apps' UI

## Rule

If both apps need the same piece of logic, a type, or a string — it goes here, not duplicated in each app. If only one app needs it, it does not belong here.
