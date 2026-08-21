# Handover — mobile v2 (PARKED)

> **This rebuild is parked as of 21 Aug 2026.** Phase 0 finished and Gate 0
> passed; work stopped there deliberately.
>
> **The React Native apps are the product.** The remaining mobile work is a
> restyle of `apps/parent-app` and `apps/staff-app` into the visual language of
> the scaffold's onboarding flow — not a rebuild. See the root
> [CLAUDE.md](../../CLAUDE.md).
>
> Everything below still describes the native rebuild accurately and is worth
> keeping: if RN tooling becomes painful again, this is a working foundation
> with the toolchain proven, the palette and brand mark done, and every
> dependency verified. **Do not resume it without being asked.**

**Written 2026-08-20.**

## Where things stand

The two mobile apps are being **rebuilt from scratch as native Android**
(Kotlin + Jetpack Compose). **Phase 0 is complete and Gate 0 has passed**
(see [BUILD_PLAN.md](BUILD_PLAN.md#phase-0--foundation)).

Both apps build, install side by side, and open in the Rukhsat palette with
the gate mark. **No feature code exists yet** — every screen is still the
reference design's copy and flow, and auth is still the scaffold's Supabase
stub. Phase 1 is where it becomes a Rukhsat app.

What exists:

| Thing | State |
|---|---|
| `backend/` | Live at `api.tideover.site`. **Not changing.** |
| `apps/admin-web/` | Live at `admin.tideover.site`. **Not changing.** It is the design reference. |
| `apps/parent-app/`, `apps/staff-app/` (React Native) | Working, deployed, linked from the live site. **Stay until native reaches parity.** |
| `apps/mobile-android/` | The Compose scaffold, committed and moved here in step 0.3. Still the reference design's content. |
| `docs/mobile-v2/` | This folder. Complete. |

## Why the rebuild

The React Native apps work but were painful in ways that kept costing days:
`expo-updates` fingerprint mismatches that failed EAS builds twice with no
useful error, pnpm workspace resolution drift, Metro's inability to follow
symlinks, and a layout bug that survived every automated check because nothing
had actually looked at the screen.

Native Android removes the build-tooling class of problem entirely and gives a
faster, more honest verification loop — build, install, screenshot, look.

## The three locked decisions

Made with the user on 2026-08-20. Do not silently revisit them.

### 1. Brand — admin-web colour, scaffold structure

> "Adopt the orange, cream but the flow and structure of buttons screens and
> everything else would be off that new app structure."

Colour, type family, and brand mark come from `apps/admin-web/`. Layout,
component shapes, and screen flow come from the scaffold. The amber/navy
"journey" identity in `New App Structure/App Logos/` is **retired** — the
files stay as the only vector source if it is ever revisited.

Full mapping: [DESIGN_ALIGNMENT.md](DESIGN_ALIGNMENT.md).

### 2. Packaging — product flavors in one Gradle project

Shared `core-ui` / `core-data` modules, two flavors producing
`com.rukhsat.parent` and `com.rukhsat.staff`. The application IDs must not
change — they match existing installs and the live site's links.

Full layout: [ARCHITECTURE.md](ARCHITECTURE.md).

### 3. React Native apps stay until parity

The live site keeps linking to the RN APKs. **The QR on `admin.tideover.site`
is not updated** until the user explicitly confirms the native apps are final.
This is a standing instruction from earlier in the project and it still holds.

Cutover is Phase 7: [BUILD_PLAN.md](BUILD_PLAN.md#phase-7--ship).

## What to do next

**Phase 1, step 1.1** — delete `data/AuthRepository.kt` and every Supabase
reference, and delete `LocationResolver.kt`. Then 1.2 builds the Ktor client
against `api.tideover.site`, which is the first point the app talks to
anything real.

Phase 0 delivered: the toolchain builds untouched, the project lives at
`apps/mobile-android/`, the package is `com.rukhsat.app`, two flavors produce
`com.rukhsat.parent` / `com.rukhsat.staff`, the palette and gate mark are
Rukhsat's, `core-ui` and `core-data` are wired, and every Phase 1-5 dependency
is on the classpath and verified to launch.

Decisions taken during Phase 0 that changed the plan: **English only** (Urdu
dropped), **Plus Jakarta Sans kept** (0.8 cancelled), **RTL off**, and the
brand mark's **barrier extended past the posts**.

See [BUILD_PLAN.md](BUILD_PLAN.md#phase-1--auth).

The plan is deliberately step-by-step with a gate at the end of each phase.
The user asked to work this way specifically so mobile problems get finished
rather than accumulating. **Verify each step on a running device and show the
user before moving on.**

## Facts worth having

### Endpoints
- API: `https://api.tideover.site/v1`
- WebSocket: `wss://api.tideover.site/v1`
- Admin dashboard: `https://admin.tideover.site`

### Seeded demo accounts
Password for **every** seeded account: `rukhsat123`

| Role | Phone | Name |
|---|---|---|
| Parent (en) | `03331000001` | Tariq Raza |
| Parent (ur) | `03331000002` | Nasreen Malik |
| Driver | `03215000011` | Ahmed Khan |
| Guard | `03007778899` | Main Gate Guard |
| Teacher | `03004445566` | Sadia Iqbal |
| Admin | `03001112233` | Imran Qureshi (web only) |

Source: `scripts/seed.py`.

### Devices
- Emulator: Pixel 6, API 37.1 → `emulator-5554`
- User's real phone: Redmi `2201117TG` → `71cd54fc`. **Do not drive it without
  asking.**

### Build commands (after Phase 0)
```bash
cd apps/mobile-android
./gradlew :app:assembleParentDebug
./gradlew :app:assembleStaffDebug
```

## Traps

Things that will cost time if not known in advance.

1. **The scaffold is not a Rukhsat app.** Its auth (Supabase email OTP), copy,
   tabs, and data are all from a reference design. Only the component language
   and screen structure are being kept. [SCAFFOLD_AUDIT.md](SCAFFOLD_AUDIT.md)
   has the file-by-file verdict.

2. **There is no OTP in Rukhsat.** No SMS, no email codes. Auth is phone +
   password. `OtpScreen` becomes a password screen.

3. **Not one string in the scaffold uses `stringResource()`.** Every composable
   hardcodes English. Fixing this later is far more expensive than doing it
   from the first screen. [I18N.md](I18N.md).

4. **`OnAccent` flips from dark to white.** Amber carried dark ink; orange
   carries white. Every usage needs a visual re-check, not just a recompile.

5. **Installs will fail over the RN builds** with
   `INSTALL_FAILED_UPDATE_INCOMPATIBLE` — same application ID, different
   signing key. Uninstall first. Expected, not a bug.

6. **The toolchain is bleeding-edge**: AGP 9.3.1, Kotlin 2.2.10, compileSdk 37,
   Compose BOM 2025.08.00. Verify it builds in step 0.1 *before* writing
   feature code. Pin down rather than debugging an alpha Gradle plugin under
   deadline.

7. **There are two Android SDKs on this machine, and the environment variables
   point at the wrong one.** The real SDK is
   `D:\Android_Studio_SDK_Location` — `android-37.0`, build-tools 36.1.0, the
   emulator, and the API 37.1 system image. `local.properties` already points
   there and is correct; **do not "fix" it.** But `ANDROID_HOME` and
   `ANDROID_SDK_ROOT` are both set to `C:\Android\Sdk`, which holds only
   `android-36` and **no system images at all**. Gradle is unaffected because
   `local.properties` wins, so this stays invisible until you launch the
   emulator, which reads the env var and dies with
   `FATAL | Broken AVD system path`. Override it for the launch:
   `ANDROID_SDK_ROOT='D:\Android_Studio_SDK_Location' emulator -avd Pixel_6`.

8. **ES256 signatures are JOSE raw R‖S and must be converted to DER** before
   `java.security.Signature.verify()` accepts them. This is the most common way
   an otherwise-correct offline check fails.
   [API_INTEGRATION.md](API_INTEGRATION.md#offline-verification--the-part-that-must-be-right).

9. **`core.autocrlf=true` and there was no `.gitattributes`.** Left alone,
   Git rewrites `gradlew` to CRLF on the next checkout and `./gradlew` then
   fails from Git Bash with `bad interpreter: /bin/sh^M` — an error that reads
   like a broken toolchain. A deliberately narrow `.gitattributes` at the repo
   root now pins `gradlew` to LF, `gradlew.bat` to CRLF, and marks binaries.
   It does **not** use a repo-wide `text=auto`, which would churn the other
   developer's working tree.

## Open items carried over

- `packages/ui-native/src/Onboarding.tsx` has an **uncommitted** fix for the
  carousel overflow bug (the `onLayout` was measuring the padded parent instead
  of the scroller). It was published as an OTA update to both RN apps'
  `preview` branch but never committed. Either commit it or discard it
  deliberately — do not leave it dangling.
- The RN apps' last successful EAS builds:
  - parent: `https://expo.dev/artifacts/eas/AZbOvld_eDuXh5AMi0WOSXm7SwvWlwNrdT_33c2niBQ.apk`
  - staff: `https://expo.dev/artifacts/eas/VfNFaM_y3dT0gnqn313ivrwXjK0yZyciuRQDY2d0iqQ.apk`

## The constraints that never move

From the root [CLAUDE.md](../../CLAUDE.md). If a task seems to require
violating one, stop and flag it rather than working around it.

- No background location. Foreground-only, on an explicit tap.
- QR codes rotate (~60s, ES256) and verify offline. Never static.
- No student search endpoint for collectors — the search itself is the leak.
- A collector never claims a child; only a parent grants access.
- The schedule is the backstop, because geofences fail on this market's phones.
- Manual fallback is mandatory in the guard app.
- No SMS. FCM only, with consent.
- English only. The Urdu requirement was dropped on 21 Aug 2026.
- No shadows anywhere — hairlines only.
- Neither app is declared as targeting children in Play Console.
