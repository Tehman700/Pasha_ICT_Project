# Build plan — mobile v2

Eight phases. **Each phase ends at a gate that is demonstrated on a running
device, not asserted.** Nothing proceeds past a red gate.

The rebuild is deliberately paced this way because the React Native attempt
failed the other way round — screens were built fast, and the problems
(untranslated strings, a fingerprint mismatch, an overflowing carousel) were
found late, on someone else's phone, under deadline.

## How to work a step

1. Read the step and the doc it points at.
2. Make the change.
3. Build, install, screenshot. See [VERIFICATION.md](VERIFICATION.md).
4. Show the user the screenshot before moving on.
5. Commit. Small and frequent.

**Do not batch multiple steps before verifying.** The whole point of this plan
is to catch a problem while it is still one step wide.

---

## Phase 0 — Foundation

No feature screens. This phase exists so that everything after it is built on
something that compiles, installs, and looks right.

| # | Step | Done when |
|---|---|---|
| 0.1 | ~~Confirm the toolchain builds as-is.~~ **DONE.** | Built untouched, no pinning needed. 18.1 MB APK, installs and runs. |
| 0.2 | ~~Fix `local.properties` `sdk.dir`.~~ **DONE — no edit needed;** it was already correct. Confirmed gitignored. | Proven with `clean` + `assembleDebug` and both SDK env vars unset. A bare `assembleDebug` reporting "up-to-date" proves nothing — force a real compile. |
| 0.3 | ~~Move to `apps/mobile-android/`, `rootProject.name` → `rukhsat-mobile`.~~ **DONE.** | Committed untouched first so the move reads as a rename. Stale `.gradle/`, `build/`, `.idea/`, `.kotlin/` deleted — they cache absolute paths to the old directory. |
| 0.4 | ~~Rename `com.example.mobile_app` → `com.rukhsat.app`.~~ **DONE.** | 26 Kotlin files + 2 lines of `app/build.gradle.kts`; the manifest needed nothing (relative `.MainActivity`). `aapt2 dump packagename` confirms `com.rukhsat.app`. Navigation exercised, not just the launch screen. |
| 0.5 | ~~Add product flavors `parent` and `staff`.~~ **DONE.** | Both APKs build and install side by side. `resValue()` for the label does **not** work on AGP 9 (`resValues` feature is off by default) — each flavor uses `src/<flavor>/res/values/strings.xml` instead. |
| 0.6 | ~~Extract `core-ui` and `core-data` modules.~~ **DONE.** | Both appear as top-level `project :core-*` entries on `:app`'s runtime classpath. Every plugin is now declared once at the root with `apply false` — requesting `com.android.library` with a version in a module fails once the application plugin has it on the classpath. |
| 0.7 | ~~Retheme `Color.kt` to admin-web tokens.~~ **DONE.** | Every amber/navy value is gone **from the Kotlin and `values/` layers**. The grep still hits `res/drawable/ic_logo_*.xml` and `ic_launcher_*.xml` — that is the brand mark, and it is **step 0.9's** job, not this one. Scope the check: `grep -rn "E8A33D\|14171F\|5B8BB8" app/src --include=*.kt --include=colors.xml`. |
| 0.8 | ~~Swap Plus Jakarta Sans → Inter.~~ **CANCELLED** 21 Aug 2026 — the user kept the scaffold's typeface. | Nothing to do. See [DESIGN_ALIGNMENT.md](DESIGN_ALIGNMENT.md#typography). |
| 0.9 | ~~Replace the brand mark with the gate glyph. Regenerate launcher icons.~~ **DONE.** | Both launcher icons verified on the emulator: gate on cream. The mark's barrier was **extended past the posts** — admin-web's version reads as a capital H at app size. See [DESIGN_ALIGNMENT.md](DESIGN_ALIGNMENT.md#the-mark-one-deliberate-difference-from-the-dashboard). |
| 0.10 | Move every hardcoded string into `app/src/main/res/values/strings.xml`. **DEFERRED into Phase 1.** | Every string on these screens is the reference design's and is about to be rewritten in 1.4-1.7. Extracting Mozi's copy now means extracting it twice. Do it as each screen is rewritten; the audit sweep in [I18N.md](I18N.md#audit-before-every-build) is the gate. |
| 0.11 | ~~Add the dependency groups, one group at a time.~~ **DONE.** | Six groups, green after each. Two things this caught: KSP needs `android.disallowKotlinSourceSets=false` on AGP 9, and ML Kit's 19.5 MB model must be `staff`-only. See [ARCHITECTURE.md](ARCHITECTURE.md#dependencies-to-add). |
| 0.12 | ~~Establish the verification loop.~~ **DONE — it has been running since 0.1.** | Two traps it turned up are written into [VERIFICATION.md](VERIFICATION.md): a capture taken too early returns the black starting window, and a cold start after a fresh install needs ~15s, not 6. |

**Gate 0 — do not proceed until all are true:**
- Both APKs install on the emulator side by side.
- The palette is the admin-web one. Note **the welcome screen is deliberately
  not cream** — it is a full-bleed inverted screen painted by `BrandPattern`,
  now on ink `#26251e` instead of navy. The cream `#f7f7f4` canvas, ink
  `#26251e` text and orange `#f54e00` accent are visible on the **step
  screens**, where the progress fill and the text cursor are orange.
- Screenshots of both apps shown to the user.

---

## Phase 1 — Auth

| # | Step | Done when |
|---|---|---|
| 1.1 | **Delete `data/AuthRepository.kt`** and every Supabase reference. Delete `LocationResolver.kt`. | No mention of Supabase, OTP, or `CODE_LENGTH` remains. |
| 1.2 | Build the Ktor client in `core-data/net`: base URL, JSON, auth header, error mapping. | A test call to `GET /schools/public` returns real schools from `api.tideover.site`. |
| 1.3 | Session storage: encrypted DataStore, `expires_in` tracking, 401 → clear + return to welcome. | Token survives an app restart; a forced 401 lands on the welcome screen. |
| 1.4 | Rewrite `WelcomeScreen` — Rukhsat copy, tour / sign in / create account. | Matches the scaffold's structure in the new palette. |
| 1.5 | Rewrite `TourScreen` — three Rukhsat cards, real copy and art. Fix the pager width bug the RN build had: measure the **`ScrollView`/pager itself**, not its padded parent. | Cards fill the viewport with no horizontal overflow at any width. |
| 1.6 | `EmailScreen` → `PhoneScreen`. **11 digits, starts `0`, hard cap.** Drop the country-code picker. | A 12th character cannot be typed. `0300…` validates; `300…` does not. |
| 1.7 | `OtpScreen` → `PasswordScreen`. Two-step sign-in preserved. | `POST /auth/login` succeeds against the live backend with a seeded account. |
| 1.8 | Role gating per [API_INTEGRATION.md](API_INTEGRATION.md#role-gating). | A parent is refused by the staff app with a clear message, and vice versa. |
| 1.9 | Parent registration: name, phone, password, **CNIC `38515-1952462-5` auto-dashed**, school picker, photo. | `POST /auth/register/parent` creates a real account. CNIC stored digits-only. No `name_ur` field — it is `nullable` in the contract, so it is simply omitted. |
| 1.10 | Driver registration: adds selfie + ID photo via `POST /uploads`. | `POST /auth/register/driver` succeeds; the driver is visible to nobody. |
| 1.11 | `PermissionsScreen` retheme. **Copy must say foreground-only.** | No background-location permission is declared or requested. |

**Gate 1:** A real account logs in against the live backend, in both apps, and
the session survives a restart.

---

## Phase 2 — Parent core

| # | Step | Done when |
|---|---|---|
| 2.1 | Dashboard shell: bottom bar, tabs Home / Children / QR / Profile. Keep the scaffold's bar structure. | Tabs switch; no shadows anywhere. |
| 2.2 | Home tab: children, today's pickup state per child, announcements. `GET /me/children`, `/me/children-pickups`, `/announcements`. | Real seeded data renders. Empty and error states exist. |
| 2.3 | Children detail: photo, class, who may collect. | `GET /students/{id}/collectors` renders. |
| 2.4 | Collectors: grant via `/collectors/lookup` by phone, revoke. | A parent grants and revokes; **no student search exists anywhere**. |
| 2.5 | Schedule: view and set. `GET`/`POST /schedules`. | A schedule saves and reloads. |
| 2.6 | Exceptions: "not today", "someone else is coming". | `POST /pickup-requests/{id}/exception` works. |
| 2.7 | Profile: name, photo, language, sign out. | Sign out clears the session. |
| 2.8 | Rewrite `CoachMarks` with Rukhsat's walkthrough. | Shows once, matches the new palette. |

**Gate 2:** A parent completes the full journey — sign in, see children, grant
a collector, set a schedule — on the emulator.

---

## Phase 3 — Collector and QR

The offline half. Get this wrong and the gate stops working.

| # | Step | Done when |
|---|---|---|
| 3.1 | Collector home: today's manifest. `GET /me/manifest`. | Real pickups render. |
| 3.2 | "On my way": `POST /trips/start`. Handle `409 no pickups today` explicitly. | Trip starts; the 409 message is shown plainly, not as a generic error. |
| 3.3 | Foreground location stream while the trip screen is open. `POST /trips/{id}/location`. | Fixes arrive server-side. **Stops on screen close and on `end`.** |
| 3.4 | Fetch the token batch: `POST /qr-tokens/batch`, **sized to the trip window**. | Enough tokens for a 25-minute wait, not a round 20. |
| 3.5 | Rotating QR display: ZXing, advance every 60s, from local storage only. | **Airplane mode: the code still rotates.** This is the test that matters. |
| 3.6 | Queue position: `GET /me/queue-entry`. | Position renders and updates. |
| 3.7 | End trip: `POST /trips/{id}/end`. | Location stops; verified by no further fixes server-side. |

**Gate 3:** With the device in airplane mode after batch fetch, the QR keeps
rotating and stays scannable. Demonstrated on video or successive screenshots.

---

## Phase 4 — Teacher

| # | Step | Done when |
|---|---|---|
| 4.1 | Teacher shell in the `staff` flavor, routed by role. | A `TEACHER` login lands here. |
| 4.2 | Queue view: `GET /queue`, `GET /pickup-requests`. | Real queue renders. |
| 4.3 | WebSocket live updates: `wss://…/ws/queue/{class_id}?token=…`. Handle `snapshot`, `update`, `ping`, and close `4401`. | Queue updates live. `4401` ends the session; **it does not reconnect in a loop**. |
| 4.4 | Staging: `POST /pickup-requests/{id}/stage`. | A child is staged and the queue reflects it. |

**Gate 4:** Two devices — a collector arriving on one, the queue updating live
on the other.

---

## Phase 5 — Guard

The most important phase. Read
[API_INTEGRATION.md](API_INTEGRATION.md#offline-verification--the-part-that-must-be-right)
before starting.

| # | Step | Done when |
|---|---|---|
| 5.1 | Guard shell, routed by role. | A `GUARD` login lands here. |
| 5.2 | Cache the school public key at login. | Key persists offline. |
| 5.3 | CameraX + ML Kit scanner. | A QR is decoded on-device. |
| 5.4 | **Offline ES256 verification.** Note the JOSE raw R‖S → DER conversion. | A valid token verifies **with the device in airplane mode**. |
| 5.5 | Clock skew ±60s; `exp`/`iat` checks. | A token 40s outside its window still verifies; one 5 minutes out does not. |
| 5.6 | Redeemed `jti` store, per day. | **The same code scanned twice is refused the second time.** |
| 5.7 | Verdict screen: child photo + collector photo, ink-inverted surface. | Guard confirms by eye. A green verdict is **not** the handover. |
| 5.8 | **Manual fallback.** Every failure path routes here, logged. | Expired code, dead camera, and no signal all still permit a logged handover. |
| 5.9 | Room queue + WorkManager sync via `POST /handovers/sync`. | Handovers recorded offline appear server-side after signal returns. |

**Gate 5:** Full airplane-mode gate run — scan, verify, confirm, record; then
signal returns and the record syncs. Plus: a replayed code is refused, and a
manual handover completes with the camera disabled.

---

## Phase 6 — Polish

| # | Step | Done when |
|---|---|---|
| 6.1 | FCM: `google-services.json` per flavor, token to `PATCH /users/me`. | A push arrives on both apps. |
| 6.2 | Hardcoded-string sweep, the audit command in [I18N.md](I18N.md#audit-before-every-build). | Returns clean. |
| 6.3 | Empty, loading, and error state for **every** list and screen. | No screen can show a blank white void. |
| 6.4 | Shadow audit: `grep -rn "shadow\|elevation" --include=*.kt`. | Only zeroed elevations. |
| 6.5 | Accessibility: content descriptions, 48dp touch targets, contrast. | TalkBack can complete a sign-in. |
| 6.6 | Rotation, small screens, large font scale. | No clipping at 1.3× font scale. |
| 6.7 | Low-end device pass — the Xiaomi/Infinix reality of this market. | Usable on the user's real phone, not just the emulator. |

**Gate 6:** Both apps walked end to end on a **real phone** by the user.

---

## Phase 7 — Ship

**Nothing in this phase happens until the user explicitly confirms the apps
are final.** The live site's QR and download links are the competition
deliverable; they are not touched speculatively.

| # | Step | Done when |
|---|---|---|
| 7.1 | Release signing keystore, kept out of git. | Signed release APKs build. |
| 7.2 | Version codes and names for both flavors. | Distinct, sane values. |
| 7.3 | `assembleParentRelease` + `assembleStaffRelease`. | Two signed APKs. |
| 7.4 | Install both from clean — uninstall the RN builds first. | Fresh install works with no leftover state. |
| 7.5 | **User confirms final.** | Explicit go-ahead received. |
| 7.6 | Host the APKs; update `admin.tideover.site` download links and QR. | Site serves the native builds. |
| 7.7 | Delete `apps/parent-app`, `apps/staff-app`, `packages/ui-native` in one commit. Update `docs/`. | Repo has one mobile stack. |
| 7.8 | Play Console: listings, screenshots, data-safety. **Neither app is declared as targeting children.** | Submitted. |

**Gate 7:** The site serves native APKs, they install from the QR on a real
phone, and the repo no longer contains two mobile stacks.

---

## Standing constraints

These bind every phase. From the root [CLAUDE.md](../../CLAUDE.md):

- **No background location.** Foreground-only, starting on an explicit tap.
- **QR codes rotate (~60s, ES256) and verify offline.** Never static.
- **No student search endpoint for collectors.** The search is the leak.
- **A collector never claims a child.** Only a parent grants access.
- **The schedule is the backstop.** Geofences fail on this market's handsets.
- **Manual fallback is mandatory** in the guard app.
- **No SMS.** FCM only, with consent.
- **English only.** Decided 21 Aug 2026; see [I18N.md](I18N.md).
- **No shadows.** Hairlines only.
- Announce contract changes before implementing them. The backend is not
  expected to change at all in this rebuild.
