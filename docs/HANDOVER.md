# Handover — where the project actually is

Written 8 Aug 2026, after the session that closed the last module. If you are
picking this repo up in a fresh Claude Code session, read this first, then
`docs/MODULE_PLAN.md`.

---

## One paragraph

All 44 modules are built and the system is live at `api.tideover.site` and
`admin.tideover.site`. What remains is **not building** — it is human testing
on real phones and a store submission. The whole chain has been verified
against production except one hop: a push notification actually landing on a
handset. That cannot be tested in Expo Go and needs an APK.

---

## Status

| | |
|---|---|
| Modules | **44 of 44** |
| Endpoints | 48 REST + 2 WebSocket |
| Tests | 188 backend · 22 frontend |
| Screens | 37 (12 parent · 9 staff · 16 admin/display) |
| Live | https://api.tideover.site · https://admin.tideover.site |

`pnpm verify` runs typecheck across 5 packages, a migration round-trip, a
reseed, all tests, and the admin build. It needs the dev databases up:

```bash
docker compose -f docker-compose.dev.yml up -d   # Postgres 5544, Redis 6399
```

**Non-default ports on purpose.** A native Postgres on 5432 silently wins over
Docker's proxy and the failure looks like a password error.

---

## What was finished in the last session

**M8.1 / M8.2 — push notifications.** Firebase project `rukhsat-87a43`, FCM
HTTP v1. No `firebase-admin` dependency: it pulls grpcio and protobuf, which is
a ~100MB install on a 1.9GB box, and all that is actually needed is a signed
JWT (pyjwt already does this for the QR tokens) and one HTTP POST. Three
notifications and no more — morning reminder, collector arriving, handed over.
**There is deliberately no teacher push; voice replaces it.**

The OAuth exchange is verified live from the production box. Delivery to a
handset is not, and cannot be until someone installs an APK.

**Guard camera.** `expo-camera` now scans the QR for real. It used to be a
pasted token. The paste field is still there, below the camera — a cracked lens
must never be why a child cannot go home.

**M9.2 — the Urdu gap.** 27 user-facing strings existed only in English, mostly
error messages added while wiring real login and the camera. All bilingual now.
`ur` is typed as `DeepMirror<Strings>`, so **a missing Urdu key is a compile
error**, not a silent English fallback.

**Over-the-air updates.** `expo-updates` on the fingerprint runtime policy, so
JS changes ship in about a minute instead of an hour.

**Local Android toolchain**, so builds no longer depend on the EAS queue.

Two bugs found and fixed along the way, both worth knowing about:

- **Expired token stranded the app.** The HTTP client always had an
  `onUnauthorized` hook and admin-web always used it; neither mobile app did.
  Tokens last 24h and the keychain keeps them across launches, so an expired
  session left every screen failing with no route back to login.
- **`expo-splash-screen` was declared but never installed.** Both `app.json`
  files had a `splash` block, which since SDK 52 requires the package as a real
  dependency. Nothing warned — prebuild, Gradle and install all succeeded, then
  the app died at startup on `ClassNotFoundException` before React Native
  started. Symptom is a white screen, GPU frames in logcat, and zero
  `ReactNativeJS` lines.

---

## Three ways to get a change onto a phone

Pick by what you changed. Most work is the first row.

| Changed | Command | Time |
|---|---|---|
| Any `.tsx`, string, style, logic, API call | save the file (Metro hot-reloads) | ~1 s |
| Same, but onto an installed APK | `npx eas update --branch preview -m "note"` | ~1 min |
| Native module, `app.json`, permissions, SDK | `npx expo run:android` (USB) | ~4 min |
| Same, but for a judge / Play Store | `npx eas build -p android --profile preview` | ~1 h |

The EAS hour is **queue time on the free tier**, not build time. It does not
get shorter. That is what OTA is for.

### Daily loop (USB, no Wi-Fi involved)

```powershell
adb reverse tcp:8081 tcp:8081          # once per plug-in
cd apps/parent-app
npx expo start --dev-client
```

Then edit and save. Staff app is the same on port 8082:

```powershell
adb -s <device> reverse tcp:8082 tcp:8082
cd apps/staff-app
npx expo start --dev-client --port 8082
```

If the dev client asks for a URL, type `http://localhost:8081` (or `:8082`).

---

## Local Android toolchain

Already installed on Tehman's machine. If you are setting up fresh:

```
JDK 17          winget install Microsoft.OpenJDK.17
Android SDK     cmdline-tools -> C:\Android\Sdk\cmdline-tools\latest
                sdkmanager platform-tools "platforms;android-36" "build-tools;36.0.0"
NDK 27.1.12297006   ~745MB
```

Environment: `JAVA_HOME`, `ANDROID_HOME=C:\Android\Sdk`, and
`%ANDROID_HOME%\platform-tools` on PATH. **Open a new terminal after setting
them** or Gradle will not find Java.

### Things that will bite you

**Download the NDK with `curl -C -`, not `sdkmanager`.** sdkmanager has no
resume: on a connection that drops, a 745MB download restarts from zero. Four
attempts failed here before switching to:

```bash
curl -L --retry 20 --retry-all-errors -C - \
  -o ndk.zip https://dl.google.com/android/repository/android-ndk-r27b-windows.zip
```

Extract to `C:\Android\Sdk\ndk\27.1.12297006` and **verify `source.properties`
exists** — a partial extract leaves a folder Gradle treats as installed.

**Two NDK versions get requested.** `expo-updates` never declares an
`ndkVersion`, so AGP falls back to its own default, different from the one Expo
picks. Gradle then downloads a second 745MB NDK mid-build. Fixed by
`plugins/with-pinned-ndk.js`, wired into both apps. It is a config plugin and
not an edit to `android/build.gradle` because that directory is regenerated by
prebuild — a hand edit vanishes and the bug comes back looking new.

**Build one app at a time.** `node-linker=hoisted` puts `expo-modules-core` at
the repo root and Gradle writes its output *into* `node_modules`. Both apps
compile the same module into the same folder, so the second one hits a locked
`classes.jar`. Fix: `./android/gradlew.bat --stop`, then rebuild.

**First build ~30 min, every build after ~4 min.** The cache is shared between
the two apps.

---

## Test accounts

Password for all: `rukhsat123`

| Role | Phone | Where it lands |
|---|---|---|
| Parent | `03331000001` | Children, On my way, rotating QR |
| Driver | `03215000011` | Trip screen, OSM map |
| Teacher | `03004445566` | Live class queue |
| Guard | `03007778899` | Scanner + manual fallback |
| Admin | `03001112233` | Web dashboard |

Wipe a session for testing: `adb shell pm clear com.rukhsat.parent`

---

## What still needs a human

Step-by-step scripts for all of this are in **`docs/TEST_PLAN.md`** — every
flow, what to expect at each step, and what to send back when it fails.


**1. The scanner on real hardware.** Parent shows a rotating QR, guard reads it
through a real lens. Everything downstream is proven; this hop is not.

**2. Push to a handset.** Backend→Google is verified. Google→phone is not.
Expo Go **cannot** test this — it receives FCM for Expo's own Firebase project,
never for `rukhsat-87a43`. Needs an APK.

**3. Urdu sweep.** Every string exists in both languages. What needs eyes is
Nastaliq clipping, mirrored rows, and numbers inside Urdu sentences.

**4. A 5-phone gate run.** Five collectors at once, real GPS drift, a phone
with no signal, a guard forced into manual fallback. Every bug worth finding is
in that run.

**5. Play Console.** Account bought, awaiting verification. Judges get a direct
APK; the store listing is for afterwards.

---

## Known state you should not be surprised by

- **The two APKs built on EAS carry the splash-screen bug** and will white-screen
  on a fresh install. They need rebuilding. Do it once, after local testing
  confirms everything — not per guess, at an hour each.
- **Those same APKs predate `expo-updates`**, so they cannot receive OTA. The
  rebuild fixes both at once.
- Both apps' `.env` point at production. There is no staging.
- `fcm-services-account.json` is a real secret and is gitignored.
  `google-services.json` is committed on purpose — it ships inside the APK
  anyway, and EAS builds from a git archive, so ignoring it means push fails on
  device with nothing to trace.

---

## Constraints that must not be quietly changed

Full list in `CLAUDE.md`. The ones most likely to be "helpfully" broken:

- **No student search endpoint for collectors.** The search itself is the leak —
  a zero-result query still confirms whether a child is enrolled.
- **No background location.** Foreground only, on an explicit tap.
- **QR rotates and is verified offline.** Never make it static, never make the
  gate depend on signal.
- **Manual fallback is mandatory.** Software must never be why a handover
  cannot happen.
- **Urdu ships with every string, in the same commit.** Not a polish pass.
- **One Alembic lineage.** Generate migrations from `backend/` only, and only
  when nobody else is mid-migration.
