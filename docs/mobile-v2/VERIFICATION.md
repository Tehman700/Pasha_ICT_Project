# Verification

**A change is not done because it compiles. It is done when it has been seen
running.**

This matters more than usual here. The React Native build shipped an
onboarding carousel whose text overflowed off the right edge — it compiled
cleanly, passed type checks, exported a production bundle without complaint,
and was only caught when a screenshot was finally taken. Nothing but looking
at it would have found it.

## The environment

- **Emulator:** Pixel 6, API 37.1, created in Android Studio.
- **Real device:** the user's Redmi (`2201117TG`, adb serial `71cd54fc`),
  connected over USB debugging.
- `adb` is on PATH and both are visible.

```bash
adb devices -l
# emulator-5554   device product:sdk_gphone16k_x86_64
# 71cd54fc        device product:spes_global model:2201117TG
```

**Target the emulator explicitly** when both are attached, so a stray command
never lands on the user's phone:

```bash
adb -s emulator-5554 <command>
```

**Do not drive the user's real phone without asking.** The emulator is the
throwaway; the phone is not.

### Emulator now, real phones at the end

Decided with the user on 2026-08-21: **all development and verification happen
on the emulator**, which is fast and responsive on this machine. Real phones
come in once there is a final signed APK to test — that is Phase 6.7 and Phase
7.4, not before. The user has physically detached the Redmi to keep it out of
the way, so `adb devices` will usually show `emulator-5554` alone. Keep using
`-s emulator-5554` regardless; the habit costs nothing and the day the phone is
plugged back in is exactly the day an unqualified command would go astray.

## The loop

```bash
cd apps/mobile-android

# 1. Build
./gradlew :app:assembleParentDebug

# 2. Install
adb -s emulator-5554 install -r app/build/outputs/apk/parent/debug/app-parent-debug.apk

# 3. Launch
adb -s emulator-5554 shell monkey -p com.rukhsat.parent -c android.intent.category.LAUNCHER 1

# 4. Screenshot
adb -s emulator-5554 exec-out screencap -p > /tmp/shot.png
```

Then **read the PNG with the Read tool.** That is the actual verification
step; the first three are just setup.

### Wait before you capture, or you will screenshot a black rectangle

`screencap` fired immediately after step 3 returns the **starting-window
snapshot** — a flat black frame — not the app. It looks exactly like a
catastrophically broken screen, and nothing contradicts that reading:
`dumpsys` reports the activity as `topResumedActivity`, the process is alive,
and logcat is clean. The window exists before Compose has drawn into it.

**Sleep ~5s between launch and capture**, and sanity-check the file size: a
flat frame is ~15KB, a real screen is 100KB+.

```bash
adb -s emulator-5554 shell monkey -p com.rukhsat.parent -c android.intent.category.LAUNCHER 1
sleep 5
adb -s emulator-5554 exec-out screencap -p > /tmp/shot.png
```

If a screen really does come back black, capture the launcher as a control
before concluding the app is broken. This cuts both ways: the point of this
document is that nobody looked and a bug shipped, but looking *too early* and
"finding" a bug that was never there costs just as much.

### Installing over the React Native builds

The native apps use the same application IDs (`com.rukhsat.parent`,
`com.rukhsat.staff`) but a different signing key, so installs will fail with
`INSTALL_FAILED_UPDATE_INCOMPATIBLE`. Uninstall first:

```bash
adb -s emulator-5554 uninstall com.rukhsat.parent
adb -s emulator-5554 uninstall com.rukhsat.staff
```

This is expected, not a bug.

## Driving the UI

```bash
adb -s emulator-5554 shell input tap <x> <y>
adb -s emulator-5554 shell input text "03001234567"
adb -s emulator-5554 shell input swipe <x1> <y1> <x2> <y2> 300
adb -s emulator-5554 shell input keyevent KEYCODE_BACK
```

Screenshots come back at the device's real resolution (1080×2400 on the
Pixel 6) but are displayed scaled. **Multiply the coordinates you read off a
displayed screenshot by the stated scale factor before using them in
`input tap`** — this is the most common reason a tap lands on nothing.

`input` commands can be slow on a cold emulator. If one hangs, check
`adb get-state` before assuming the app crashed.

## What to check on every screen

Before calling any screen done:

| Check | How |
|---|---|
| **No horizontal overflow** | Text wraps; nothing runs off the right edge. The RN bug. |
| **Both languages** | Toggle to Urdu. Nastaliq renders, no severed glyphs, no clipped descenders. |
| **Palette** | Cream `#f7f7f4`, ink `#26251e`, orange `#f54e00`. No amber, no navy. |
| **No shadows** | Depth is hairlines and fills only. |
| **Empty state** | What does it look like with zero items? |
| **Error state** | Kill the network and look. |
| **Keyboard** | Does the focused field stay visible? |
| **Large font** | 1.3× system font scale — anything clipped? |

## Offline testing

Three features must work with no network. Test them that way, not by hoping.

```bash
# Airplane mode on
adb -s emulator-5554 shell cmd connectivity airplane-mode enable

# ... exercise the feature ...

# Back on
adb -s emulator-5554 shell cmd connectivity airplane-mode disable
```

- **Phase 3:** the collector's QR keeps rotating after the batch is fetched.
- **Phase 5:** the guard verifies a token and records a handover.
- **Phase 5:** the queued handover syncs once signal returns.

## Logs

```bash
adb -s emulator-5554 logcat -c                                  # clear first
adb -s emulator-5554 logcat --pid=$(adb -s emulator-5554 shell pidof -s com.rukhsat.parent)
adb -s emulator-5554 logcat *:E                                 # errors only
```

## Comparing against the dashboard

For palette work, put a screenshot of the rebuilt screen next to
`https://admin.tideover.site` and compare the canvas, ink, and orange
directly. A cream that reads cooler or an orange that reads redder means a
token was missed in `Color.kt`.

## What does not count as verification

- "It compiles."
- "The types check."
- "I changed the token, so the colour must be right."
- A screenshot taken before the change was installed.
- The user's phone doing the checking, when the emulator was available.

## Reporting

Show the user the screenshot. If something is wrong, say so plainly with the
evidence rather than describing the change as complete. A failing gate that is
reported is cheap; one that is glossed over costs a day.
