# Architecture — native Android

## Where the project lives

Move `New App Structure/` → **`apps/mobile-android/`** in Phase 0.

The current name has a space in it, which breaks Gradle wrapper invocations,
CI paths, and `adb` one-liners on Windows often enough to be worth the
five-minute move. It also sits at the repo root, outside the `apps/`
convention every other surface follows.

```
apps/mobile-android/
  settings.gradle.kts
  gradle/libs.versions.toml
  core-ui/          theme, design tokens, shared composables
  core-data/        API client, auth, session, models, offline cache
  app/
    src/main/       shared shell: nav host, splash, settings
    src/parent/     parent + collector screens
    src/staff/      teacher + guard screens
```

## Product flavors

One Gradle project, two APKs. Shared code is written once.

```kotlin
// app/build.gradle.kts
android {
    namespace = "com.rukhsat.app"

    defaultConfig {
        minSdk = 24
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"
    }

    flavorDimensions += "surface"
    productFlavors {
        create("parent") {
            dimension = "surface"
            applicationId = "com.rukhsat.parent"
            resValue("string", "app_name", "Rukhsat")
        }
        create("staff") {
            dimension = "surface"
            applicationId = "com.rukhsat.staff"
            resValue("string", "app_name", "Rukhsat Staff")
        }
    }
}
```

Build commands:

```bash
./gradlew :app:assembleParentRelease
./gradlew :app:assembleStaffRelease
./gradlew :app:assembleParentDebug :app:assembleStaffDebug   # both, for the emulator
```

**The application IDs must stay `com.rukhsat.parent` and `com.rukhsat.staff`.**
They match the React Native builds already installed on the user's phone and
the emulator, and the links on `admin.tideover.site`. Changing them would
orphan every existing install and force a new Play listing.

Because the IDs match, a native debug build **will refuse to install over** an
RN build (different signing key). Uninstall first — see [VERIFICATION.md](VERIFICATION.md).

## Who uses which flavor

| Flavor | Roles | Screens |
|---|---|---|
| `parent` | `PARENT`, `COLLECTOR` (driver) | Children, collectors, schedule, QR display, "On my way", trip tracking |
| `staff` | `TEACHER`, `GUARD` | Queue, staging, scanner, verdict, manual fallback |

The **role comes from the login response** (`user.role`), not from a picker.
The staff flavor branches to the teacher or guard shell after auth; a parent
signing into the staff app is refused with a clear message, and vice versa.

Collector (driver) is deliberately in the *parent* flavor: a driver is a
member of the public who self-registers, not school staff. This matches the
constraint that the school vets nobody.

## Modules

### `core-ui`
Theme, tokens, and every shared composable. **No feature code, no networking.**
Depends on nothing but Compose. This is the module that guarantees the two
apps look identical.

### `core-i18n` — dropped
There is one language, so a module for it earns nothing. String resources live
in `app/src/main/res/values/strings.xml`. See [I18N.md](I18N.md).

### `core-data`
The API client, session storage, domain models, and the offline cache.
Exposes repositories; screens never see HTTP.

```
core-data/
  net/        Ktor client, auth interceptor, error mapping
  session/    encrypted token storage, current user
  model/      Kotlin data classes mirroring openapi.yaml
  repo/       AuthRepository, ChildrenRepository, TripRepository, ...
  local/      Room database, for the guard's offline handover queue
```

## Dependencies to add

The scaffold's version catalog is missing everything below. Add in Phase 0,
one group at a time, verifying the build after each.

| Need | Library | Why this one |
|---|---|---|
| HTTP + JSON | **Ktor client (OkHttp engine)** + `kotlinx-serialization` | Coroutine-native, and the one piece that ports to iOS if this ever goes Multiplatform. Retrofit is equally fine if preferred — pick one and stay. |
| Token storage | **DataStore** + `androidx.security:security-crypto` | Access tokens must not sit in plain SharedPreferences. |
| QR scanning | **CameraX** + **ML Kit barcode scanning** | ML Kit's bundled model works offline, which the gate requires. |
| QR display | **ZXing core** (`com.google.zxing:core`) | Generation only; render the bitmap in Compose. |
| Offline queue | **Room** | The guard's handovers must survive a force-close with no signal. |
| Background sync | **WorkManager** | Flushes the handover queue when signal returns. |
| Push | **Firebase Cloud Messaging** | Already the system's notification channel. Needs `google-services.json` per flavor. |
| Images | **Coil** | Already in the catalog. Keep. |

### What adding them actually turned up

Added 21 Aug 2026, one group at a time, exactly as this section says. Two
things only showed up because of that:

**1. KSP breaks AGP 9's built-in Kotlin.** Room's annotation processor fails
configuration with *"Using kotlin.sourceSets DSL to add Kotlin sources is not
allowed with built-in Kotlin"*. KSP registers its generated sources the old
way. The bridge — which AGP names in the error itself — is
`android.disallowKotlinSourceSets=false` in `gradle.properties`. It is flagged
experimental, and can be dropped once KSP registers through
`android.sourceSets`.

**2. The QR libraries must be flavor-scoped, not shared.** ML Kit's bundled
barcode model is `libbarhopper_v3.so`, **19.5 MB** across four ABIs. Shipping
it to both apps put it in the parent APK, which never scans a code — it
displays one. On the cheap handsets and metered data this market runs on, that
is a real cost to a parent for a library they never call.

```kotlin
"staffImplementation"(libs.mlkit.barcode.scanning)   // guard scans
"parentImplementation"(libs.zxing.core)              // collector displays
```

CameraX is staff-only for the same reason: `PhotoScreen` captures through the
system picker, not CameraX. Verified in the built APKs — 19.49 MB of native
libs in staff, 0.06 MB in parent.

Note the quoted configuration names. The Kotlin DSL does not generate typed
`staffImplementation(...)` accessors for flavors declared in the same file.

**The model stays bundled**, not the Play-Services-delivered variant. The gate
has to verify with no signal, so an on-demand download is not acceptable.

**Firebase is a dependency only so far.** The `google-services` plugin and the
per-flavor `google-services.json` are step 6.1; adding the plugin now, with no
JSON in the tree, fails the build.

**ES256 verification needs no dependency.** `java.security.Signature` with
`SHA256withECDSA` and a `KeyFactory`-parsed P-256 public key covers it. Adding
a JWT library for one verification is not worth the size. See
[API_INTEGRATION.md](API_INTEGRATION.md).

## State and navigation

Keep the scaffold's approach — it is already correct for this size of app:

- **One `NavHost`** per flavor shell, routes as `const val` in a `Routes` object.
- **ViewModel per flow**, not per screen. The signup flow shares one VM so
  every step reads the same draft; the dashboard has its own.
- **Compose state** (`mutableStateOf`) for UI state, `StateFlow` only where a
  stream genuinely crosses layers (live location, queue updates over WebSocket).
- No DI framework. Constructor defaults (`= defaultAuthRepository()`) are what
  the scaffold uses and they are sufficient. Hilt can wait for a real need.

## Offline behaviour — the part that matters

Three things must work with no network, because they happen at a school gate
in Pakistan:

1. **The collector's rotating QR.** A batch of pre-signed tokens is fetched
   when the trip starts and rotated locally. The phone never calls out to
   display a code.
2. **The guard's verification.** ES256 signature checked against a cached
   public key. Redeemed `jti`s stored locally for the day to stop a forwarded
   screenshot being reused.
3. **The handover record.** Written to Room immediately, synced later via
   WorkManager against `POST /handovers/sync`.

Anything else may assume a network and show an honest error when there isn't one.

## Permissions

Declare only what is used, per flavor.

| Permission | Flavor | Why |
|---|---|---|
| `INTERNET` | both | — |
| `ACCESS_FINE_LOCATION` | parent | Foreground trip tracking only |
| `POST_NOTIFICATIONS` | both | FCM |
| `CAMERA` | both | Guard scans; parent uploads a profile photo |

**Never declare `ACCESS_BACKGROUND_LOCATION` or `FOREGROUND_SERVICE_LOCATION`.**
The React Native apps explicitly blocked both. Location starts on an explicit
"On my way" tap and stops when the trip ends or the screen closes. This is a
hard constraint from the root `CLAUDE.md`, and it is also a Play Console
review risk if violated.

Neither app is declared as targeting children in Play Console. The users are
adults — parents, teachers, guards.
