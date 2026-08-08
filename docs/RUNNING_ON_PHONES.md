# Running the apps on a phone

Both apps run against **live production** (`api.tideover.site`). There is no
staging. Sign in with a seeded account — see the table at the bottom.

There are three ways to get a change onto a phone. Pick by what you changed.

| Changed | How | Time |
|---|---|---|
| `.tsx`, strings, styling, logic, API calls | save the file | ~1 s |
| Same, onto an already-installed APK | `eas update` | ~1 min |
| Native module, `app.json`, permissions, SDK | `expo run:android` over USB | ~4 min |
| Same, for a judge or the Play Store | `eas build` | ~1 h |

> The EAS hour is **queue time on the free tier**, not build time, and it does
> not get shorter with practice. That is the whole reason OTA and the local
> toolchain exist.

---

## 1. Daily development — USB, no Wi-Fi

This is where you will spend almost all your time. The phone talks to Metro
**through the cable**, so router isolation, firewalls and LAN addresses stop
mattering entirely.

One-time, per phone:

- Settings → About phone → tap **Build number** seven times
- Developer options → **USB debugging** ON
- Developer options → **Install via USB** ON
  *(Xiaomi/Redmi also needs **USB debugging (Security settings)** — installs
  fail silently without it)*
- Plug in, accept **Allow USB debugging?**, tick *always allow*
- If the phone only charges: pull down the shade, tap the USB notification,
  choose **File transfer**

Then, each session:

```powershell
adb devices                              # confirm the phone is listed
adb reverse tcp:8081 tcp:8081
cd apps/parent-app
npx expo start --dev-client
```

Staff app is identical on 8082:

```powershell
adb -s <device-id> reverse tcp:8082 tcp:8082
cd apps/staff-app
npx expo start --dev-client --port 8082
```

Edit any file, save, and the phone updates in about a second.

**Two phones connected?** Every `adb` command needs `-s <device-id>`, or it
errors about multiple devices. `adb devices -l` lists the ids.

**If the dev client asks for a URL**, type `http://localhost:8081` (or `:8082`
for staff). That is the phone's own port, forwarded down the cable.

---

## 2. Pushing to an installed APK — `eas update`

For a teammate or a judge who already has the app:

```bash
cd apps/parent-app
npx eas update --branch preview -m "fixed Urdu on the queue screen"
```

They get it on next launch. Works for anything that is only JavaScript.

**It will not work for native changes** — the runtime version is on the
`fingerprint` policy, so an update that assumes a native module the installed
APK lacks simply is not served. That is deliberate: the alternative is the app
crashing on launch with a blank screen and nothing to explain it.

---

## 3. Building an APK

### Locally, over USB (fast)

```powershell
cd apps/parent-app
npx expo run:android
```

Builds and installs in one step. **First run ~30 min** (Gradle downloads
everything), then **~4 min**. Add `--variant release` for a fast,
judge-ready build that embeds the JS bundle.

### On EAS (for distribution)

```bash
cd apps/parent-app
npx eas build --platform android --profile preview
```

Produces a download link and QR. Needed for Play Store submission, and for
anyone who cannot plug into your laptop.

---

## Toolchain setup (local builds only)

Skip this if you only use Expo Go or EAS.

```powershell
winget install Microsoft.OpenJDK.17
```

Android SDK — command-line tools only, no Android Studio needed. Unpack to
`C:\Android\Sdk\cmdline-tools\latest`, then:

```powershell
sdkmanager --licenses
sdkmanager platform-tools "platforms;android-36" "build-tools;36.0.0"
```

Set `JAVA_HOME`, `ANDROID_HOME=C:\Android\Sdk`, and put
`%ANDROID_HOME%\platform-tools` on PATH. **Open a new terminal afterwards** —
environment variables do not reach terminals that were already running.

### The NDK — download it manually

Gradle wants NDK `27.1.12297006`. Do **not** let `sdkmanager` fetch it: it has
no resume, so a dropped connection restarts a 745MB download from zero. Four
attempts failed here before switching to:

```bash
curl -L --retry 20 --retry-all-errors -C - \
  -o ndk.zip https://dl.google.com/android/repository/android-ndk-r27b-windows.zip
```

Extract to `C:\Android\Sdk\ndk\27.1.12297006`, then **check `source.properties`
exists in it**. A partial extract leaves a folder Gradle happily treats as a
complete install, and the resulting error names a package you never asked for.

---

## Troubleshooting

**White screen, app does not crash.**
A native module is declared in `app.json` but missing from `package.json`.
Check logcat: GPU frames drawn, zero `ReactNativeJS` lines, and a
`ClassNotFoundException` somewhere above. This exact bug shipped once via
`expo-splash-screen`.

```powershell
adb logcat -d | Select-String "ClassNotFoundException|ReactNativeJS"
```

**`Unable to delete file ... classes.jar`.**
Both apps compile the shared `expo-modules-core` into the same folder under
`node_modules`, so they cannot build at the same time.

```powershell
.\android\gradlew.bat --stop
```

**`Failed to install the following SDK components: ndk;<some other version>`.**
`expo-updates` does not declare an `ndkVersion`, so AGP uses its own default.
`plugins/with-pinned-ndk.js` fixes this and is already wired into both apps —
if you see it, the plugin was dropped from `app.json`.

**`INSTALL_FAILED_USER_RESTRICTED`.**
Xiaomi. Turn on **Install via USB** and **USB debugging (Security settings)**.
If it persists, Developer options → turn off **MIUI optimization**, reboot.

**Metro unreachable / stuck "Downloading".**
You are on Wi-Fi instead of USB. Use `adb reverse`, or as a last resort
`npx expo start --tunnel` (slower, works on any network).

**Running Metro from WSL does not work.**
WSL2 sits behind its own virtual network. Your phone cannot reach it. Run
Metro from PowerShell; keep WSL for `ssh`, `scp` and `eas`.

**Notifications never arrive in Expo Go.**
Expected, permanently. Expo Go receives FCM for Expo's own Firebase project,
never for `rukhsat-87a43`. Push can only be tested from an APK.

---

## Test accounts

Password for all: `rukhsat123`

| Role | Phone | Lands on |
|---|---|---|
| Parent | `+923331000001` | Children, On my way, rotating QR |
| Driver | `+923215000011` | Trip screen, OSM map |
| Teacher | `+923004445566` | Live class queue |
| Guard | `+923007778899` | Scanner + manual fallback |
| Admin | `+923001112233` | https://admin.tideover.site |

Wipe a stored session — the token is in the device keychain and survives
reinstalls of the JS bundle:

```powershell
adb shell pm clear com.rukhsat.parent
```

---

## The end-to-end run

Two phones, one parent and one staff:

1. **Parent** → sign in → **On my way** → **Show pickup code**, brightness up
2. **Guard** → sign in → allow camera → point at the parent's screen
3. Verdict screen names the child → confirm handover
4. **The parent's phone should get a notification naming the collector**

Step 4 is the last unverified hop in the system. Everything before it has been
checked against production.
