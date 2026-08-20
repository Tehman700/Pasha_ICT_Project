# Prompt for the new session

Paste the block below as the first message in a fresh Claude Code session.

Everything it needs is already in the repo — this prompt just points at it and
sets the working style. Keep it short deliberately; a long prompt competes with
the docs instead of routing to them.

---

```
We're rebuilding Rukhsat's two mobile apps from scratch as native Android
(Kotlin + Jetpack Compose), replacing the React Native apps. The backend and
the admin web dashboard are finished, live, and not changing.

Read these before doing anything, in order:
  1. docs/mobile-v2/HANDOVER.md      — where things stand, decisions, traps
  2. docs/mobile-v2/BUILD_PLAN.md    — the phased plan we're following
  3. docs/mobile-v2/SCAFFOLD_AUDIT.md — what the starting scaffold actually is

Then start at Phase 0, step 0.1 and work down.

How I want you to work:

- One step at a time. Build it, install it on the emulator, screenshot it,
  show me the screenshot, then stop and wait for me before the next step.
  Don't batch steps.
- A step isn't done because it compiles. It's done when you've looked at it
  running. Last time a broken layout shipped because nothing ever took a
  screenshot.
- Every user-facing string ships in English AND Urdu in the same change.
  Not later.
- If something in the plan looks wrong once you're in the code, say so and
  stop rather than working around it quietly.
- Don't touch the QR codes or download links on admin.tideover.site. The
  React Native apps stay live until I tell you the native ones are final.

The emulator is running (Pixel 6, API 37.1). My real phone may also be
connected — use the emulator, and ask before doing anything on the phone.

Start with step 0.1: confirm the scaffold builds untouched, before changing
anything.
```

---

## Why it's shaped this way

- **It routes rather than repeats.** The three docs it names pull in everything
  else. Restating the architecture here would create a second source of truth
  that drifts from `docs/mobile-v2/`.
- **It sets the pace explicitly.** "One step at a time, stop and wait" is the
  main thing that was missing last time and the main thing the user asked for.
- **It names the verification standard**, with the reason attached. A rule with
  its cause behind it survives; a bare rule gets rationalised away.
- **It restates the QR/link freeze**, because that's the one instruction where
  a well-meaning session could do real damage to a live competition entry.

## If the session drifts

Two things worth repeating verbatim mid-session, since they're the ones that
tend to erode:

> Stop. Screenshot what you just built and show me before moving on.

> Did that string get added to values-ur/strings.xml in the same change?
