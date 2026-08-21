# Scaffold audit — `apps/mobile-android/`

> Moved here from `New App Structure/` in step 0.3. Paths below are relative
> to `apps/mobile-android/`.

An honest inventory of what the starting scaffold actually is, so nobody
mistakes placeholder content for a working Rukhsat app.

## What it is

A **Jetpack Compose onboarding scaffold** built against a reference design
(Mozi, screenshots in `New App Structure/Mozi iOS Onboarding/`). It is a
well-built, well-commented UI shell with a complete signup flow.

It is **not** a Rukhsat app. Its auth model, its copy, its data, its tabs, and
its brand are all from somewhere else. The value is in the *component
language and screen structure*, which is exactly what we are keeping.

## What it gets right, and we keep

- Genuine attention to detail: the disabled-state advance button, the label
  that shrinks once a field has a value, the countdown that actually expires
  the code, the switch that falls back off when a permission is declined.
- Clean separation: `ui/components/`, `ui/theme/`, `screens/`, `data/`, `nav/`.
- Comments explain *why*, not what. Keep that standard.
- One `NavHost` holding the whole flow, one shared ViewModel across signup
  steps. The right shape.
- Edge-to-edge handled properly, with the background painted behind system bars.
- `imePadding()` on the onboarding scaffold — keyboard handling already correct.

## What is placeholder and must be replaced

| Thing | Currently | Must become |
|---|---|---|
| Auth | Email + 6-digit OTP via **Supabase** | **Phone + password** against `api.tideover.site/v1` |
| Tour copy | "See where you overlap with friends", "Miriam is coming to town" | Rukhsat's three-card pitch |
| Dashboard | "Invite your friends", greeting + city | Parent's children, today's pickup, QR access |
| Tabs | Home / My Plans / My People / Profile | Parent: Home / Children / QR / Profile |
| Coach marks | Four Mozi value props | Rukhsat's walkthrough |
| Palette | Amber `#E8A33D` / navy `#14171F` | Orange `#f54e00` / ink `#26251e` / cream `#f7f7f4` |
| Brand mark | Journey glyph (ring→arc→dot) | Gate glyph, from `apps/admin-web/app/icon.svg` |
| Package | ~~`com.example.mobile_app`~~ → `com.rukhsat.app` in 0.4 | Namespace stays `com.rukhsat.app`; the **application IDs** `com.rukhsat.parent` / `com.rukhsat.staff` come from the flavors in 0.5 |
| Strings | Hardcoded English in every composable | `stringResource()` against `values/strings.xml` |

## File-by-file

Legend: **KEEP** = use nearly as-is · **RETHEME** = keep structure, swap tokens
· **REWRITE** = keep the shape, replace the content · **DELETE** = does not
apply to Rukhsat.

### `ui/theme/`

| File | Verdict | Notes |
|---|---|---|
| `Color.kt` | **RETHEME** | Same object shape, admin-web values. Full mapping in [DESIGN_ALIGNMENT.md](DESIGN_ALIGNMENT.md). |
| `Theme.kt` | **KEEP** | Light-only by intent is correct and matches admin-web. |
| `Type.kt` | **RETHEME** | Plus Jakarta Sans → Inter, to match admin-web. One ramp only; see [I18N.md](I18N.md). |

### `ui/components/`

| File | Verdict | Notes |
|---|---|---|
| `Buttons.kt` | **RETHEME** | `PillButton` + `CircleArrowButton` + `CircleBackButton` are the flow's spine. Keep all three. Retune fills. |
| `Fields.kt` | **RETHEME + EXTEND** | `FieldCard`, `OtpBoxes`, `PrivacyNote` all keep. `PhoneNumberRow` needs the **11-char `0`-prefixed** rule, not `take(15)`. Add a `CnicField` (`38515-1952462-5`). |
| `Scaffolding.kt` | **KEEP** | `OnboardingScaffold`, `ProgressTrack`, `PageDots`, `CircleIconSlot`. This is the flow structure the user chose. |
| `Brand.kt` | **DONE — 0.9** | Same composable, gate-glyph drawables, with the barrier extended past the posts. |
| `BrandPattern.kt` | **RESOLVED — orange** | Was a navy gradient. Now a flat `#F54E00` ground with white arcs at 10.5% alpha, which is what the reference design itself does. See [DESIGN_ALIGNMENT.md](DESIGN_ALIGNMENT.md#what-the-reference-screens-actually-contain). |

### `screens/`

| File | Verdict | Notes |
|---|---|---|
| `WelcomeScreen.kt` | **RETHEME** | Structure is right: tour / primary CTA / quiet "I already have an account". Copy and colours change. |
| `TourScreen.kt` | **REWRITE** | Pager + dots + advance button all keep. All three cards' art and copy are Mozi's. |
| `EmailScreen.kt` | **REWRITE → `PhoneScreen.kt`** | Step-one shape is exactly right. Field becomes phone, validation becomes the 11-digit rule. |
| `OtpScreen.kt` | **REWRITE → `PasswordScreen.kt`** | **There is no OTP in Rukhsat — no SMS, no email codes.** Step two is a password. Keep the two-step *feel*; `OtpBoxes` itself may still serve a future PIN. |
| `NameScreen.kt` | **KEEP** | Registration still collects a name. No `name_ur` — it is `nullable` in the contract. |
| `PhotoScreen.kt` | **KEEP** | Registration collects a photo. Wire to `POST /uploads`. |
| `PermissionsScreen.kt` | **RETHEME** | Correct pattern. **Location copy must say foreground-only** and must never request background location. |
| `FinishingScreen.kt` | **KEEP** | Hand-off animation. |
| `DashboardScreen.kt` | **REWRITE** | Bottom bar and tab scaffolding keep; every tab's content is Mozi's. |
| `CoachMarks.kt` | **REWRITE** | Overlay mechanism keeps, all four marks' copy is Mozi's. |

### `data/`

| File | Verdict | Notes |
|---|---|---|
| `AuthRepository.kt` | **DELETE** | Supabase GoTrue. Rukhsat has its own FastAPI backend. Replace per [API_INTEGRATION.md](API_INTEGRATION.md). |
| `SignupViewModel.kt` | **REWRITE** | Shape is good — one VM across the flow. Fields change entirely (no `code`, no `secondsRemaining`). |
| `LocationResolver.kt` | **DELETE** | Resolves a city name from last-known fix, for a greeting. Rukhsat needs a live foreground stream during an active trip. Different problem; see [API_INTEGRATION.md](API_INTEGRATION.md). |

### Build files

| File | Verdict | Notes |
|---|---|---|
| `settings.gradle.kts` | **REWRITE** | `rootProject.name`, plus the new `core-*` modules. |
| `app/build.gradle.kts` | **REWRITE** | Namespace, applicationId, flavors, signing, and the missing dependencies below. |
| `gradle/libs.versions.toml` | **EXTEND** | Missing: networking, serialization, DataStore, CameraX, ML Kit barcode, Room, WorkManager, Firebase. |
| `gradle.properties` | **KEEP** | Configuration cache on is fine. |
| `local.properties` | **CORRECT AS-IS** | `D:\Android_Studio_SDK_Location` **is** the real SDK on this machine. Verified in step 0.2 with a clean build and `ANDROID_HOME`/`ANDROID_SDK_ROOT` both unset. Do not change it. Stays uncommitted (ignored at `.gitignore:15`). |

## Toolchain notes

The scaffold targets a **bleeding-edge toolchain**: AGP `9.3.1`, Kotlin
`2.2.10`, `compileSdk 37`, `targetSdk 37`, Compose BOM `2025.08.00`. It also
uses AGP 9's new `compileSdk { version = release(37) }` DSL.

**Verified in step 0.1: it builds clean, untouched, with no pinning needed.**
`BUILD_SUCCESSFUL`, a 18.1 MB debug APK, which installs and runs. The one
piece of noise is a harmless
`Unable to strip ... libandroidx.graphics.path.so`, which does not fail the
build. Note that build-tools tops out at **36.1.0** with no 37.x installed and
AGP resolves this without complaint — do not "fix" that either.

If the toolchain does start fighting later, pin down rather than fighting it —
a competition build is not the place to debug an alpha Gradle plugin.

## Assets on hand

- `New App Structure/App Logos/` — three SVGs of the **amber journey mark**.
  Retired by the brand decision, but keep the files; they are the only vector
  source if the identity is ever revisited.
- `New App Structure/Mozi iOS Onboarding/` — 23 reference screenshots. These
  are the **structural** reference the user chose. Consult them for layout,
  spacing, and flow. Ignore their colour entirely.
- `app/src/main/res/font/` — Plus Jakarta Sans, 5 weights. Superseded by Inter
  for admin-web alignment, but harmless to leave until Phase 0 swaps them.
