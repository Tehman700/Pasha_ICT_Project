# Mobile v2 — native Android rebuild

The two mobile apps are being rebuilt from scratch as **native Android
(Kotlin + Jetpack Compose)**, replacing the React Native apps in
`apps/parent-app/` and `apps/staff-app/`.

This folder is the complete context for that rebuild. The backend, the admin
web dashboard, and the API contract are **not changing** — only the mobile
clients.

## Read in this order

| # | Doc | What it answers |
|---|---|---|
| 1 | [HANDOVER.md](HANDOVER.md) | **Start here.** Where the rebuild stands, what is decided, what is next. |
| 2 | [SCAFFOLD_AUDIT.md](SCAFFOLD_AUDIT.md) | What is in `New App Structure/`, file by file: keep, retheme, rewrite, or delete. |
| 3 | [ARCHITECTURE.md](ARCHITECTURE.md) | Gradle modules, product flavors, package names, networking, offline storage. |
| 4 | [DESIGN_ALIGNMENT.md](DESIGN_ALIGNMENT.md) | Exact token values, the scaffold→admin-web colour mapping, component rules. |
| 5 | [API_INTEGRATION.md](API_INTEGRATION.md) | Every endpoint each app calls, auth, token storage, offline QR verification. |
| 6 | [I18N.md](I18N.md) | English + Urdu in Compose. Non-negotiable, applies from the first screen. |
| 7 | [BUILD_PLAN.md](BUILD_PLAN.md) | **The step-by-step plan.** Phases 0–7, each with a definition of done. |
| 8 | [VERIFICATION.md](VERIFICATION.md) | The emulator/adb loop. How a change is proven, not assumed. |
| — | [SESSION_PROMPT.md](SESSION_PROMPT.md) | The prompt to open a fresh Claude Code session with. |

## The three decisions already locked

Made deliberately on 2026-08-20. Do not silently revisit them.

1. **Brand: admin-web palette, scaffold structure.** The apps use the live
   dashboard's orange/cream/ink tokens and gate glyph. They use the *New App
   Structure*'s layout, flow, and component language — pill buttons, circle
   arrow navigation, field cards, OTP boxes, progress track, coach marks.
   The amber/navy "journey" identity is retired. See [DESIGN_ALIGNMENT.md](DESIGN_ALIGNMENT.md).

2. **Packaging: product flavors in one Gradle project.** Shared `core-*`
   modules, two flavors producing `com.rukhsat.parent` and `com.rukhsat.staff`.
   See [ARCHITECTURE.md](ARCHITECTURE.md).

3. **The React Native apps stay until the native builds reach parity.** The
   live site keeps linking to the RN APKs, and the QR on
   `admin.tideover.site` is **not** updated, until native is verified on a
   real device. See [BUILD_PLAN.md](BUILD_PLAN.md) Phase 7.

## What is not changing

- `backend/` — FastAPI, PostgreSQL, Redis. Untouched.
- `apps/admin-web/` — the Next.js dashboard. **Untouched.** It is the design
  reference the apps align *to*.
- `docs/api/openapi.yaml` — the contract. The apps are clients of it.
- Every constraint in the root [CLAUDE.md](../../CLAUDE.md) still binds:
  no background location, rotating QR codes, no collector student search,
  mandatory manual fallback, no SMS, Urdu required.

## Relationship to the older docs

`docs/HANDOVER.md`, `docs/MODULE_PLAN.md`, and `docs/RUNNING_ON_PHONES.md`
describe the **React Native** apps and the system as deployed. They remain
accurate for the backend, the admin web, and the live deployment. Where they
describe mobile screens, this folder supersedes them.
