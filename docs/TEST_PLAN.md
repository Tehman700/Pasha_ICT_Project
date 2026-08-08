# Test plan — every flow, step by step

For testing on real phones against live production. Setup is in
`docs/RUNNING_ON_PHONES.md`; this document assumes both apps are installed and
running.

**How to report a failure.** Say what you did, what you expected, and what
appeared on screen — the exact words. Screenshots beat descriptions. Release
builds silence `console.log`, so on-screen text is usually the only evidence
that survives.

Accounts (password `rukhsat123` for all):

| Role | Phone | App |
|---|---|---|
| Parent | `+923331000001` | parent |
| Driver | `+923215000011` | parent |
| Teacher | `+923004445566` | staff |
| Guard | `+923007778899` | staff |
| Admin | `+923001112233` | web |

Clear a session between roles: `adb shell pm clear com.rukhsat.parent`

---

## T0 — Before anything else

| # | Do | Expect |
|---|---|---|
| 0.1 | Open the app | Login screen, cream background, orange dot after "Rukhsat" |
| 0.2 | Tap **اردو** top-right | Every visible string switches to Urdu. Tap again to return |
| 0.3 | Sign in with a wrong password | *"Incorrect phone number or password."* — not a crash, not a blank screen |
| 0.4 | Turn off the phone's internet, try again | *"Could not reach the server…"* — a **different** message from 0.3 |

0.3 and 0.4 must differ. If both say the same thing, the error handling has
regressed and nobody will be able to tell a typo from an outage.

---

## T1 — Parent, the everyday path

Sign in as **parent**.

| # | Do | Expect |
|---|---|---|
| 1.1 | Land on home | Today's pickup, the children's names, a clear primary action |
| 1.2 | Allow notifications when asked | Prompt appears **after** login, never before |
| 1.3 | Tap **On my way** | Trip starts. A note says location is shared only while the screen is open |
| 1.4 | Tap **Show pickup code** | A QR appears with "Refreshes every 60 seconds" |
| 1.5 | Watch for ~70 seconds | The QR **visibly changes**. If it never changes, rotation is broken |
| 1.6 | Turn off internet, stay on the QR screen | The QR still works — tokens are pre-fetched in a batch |
| 1.7 | Go back, then **End trip** | Trip stops cleanly |

**1.5 is the security-critical one.** A static QR is a photograph anyone can
reuse.

---

## T2 — Parent, managing who may collect

| # | Do | Expect |
|---|---|---|
| 2.1 | Open **Who can collect my children** | Your own collectors only |
| 2.2 | **Add someone** → school-approved driver | A phone-number field, not a searchable list of drivers |
| 2.3 | Enter a made-up number | *"No driver registered with that number."* |
| 2.4 | Enter `+923215000011` | Ahmed Khan appears. Confirm and choose children |
| 2.5 | Open a collector | School-registered vs added-by-you is stated plainly |
| 2.6 | **Remove access** | Gone from the list |
| 2.7 | **Change for today** | An exception that says it applies to today only |

**2.2 matters.** There must be **no student search** anywhere for a collector,
and no browsable list of children. If you find one, stop and report it — a
zero-result search still confirms whether a child is enrolled.

---

## T3 — Driver

Clear the session, sign in as **driver**.

| # | Do | Expect |
|---|---|---|
| 3.1 | Land on home | Children to collect, across more than one family |
| 3.2 | Check the manifest | Only children whose parents linked him. No one else's |
| 3.3 | **On my way** → map | OpenStreetMap tiles, your position. No Google billing prompt |
| 3.4 | Show the pickup code | One code covering the whole trip |

---

## T4 — Guard, the gate

Second phone, staff app, sign in as **guard**.

| # | Do | Expect |
|---|---|---|
| 4.1 | Land after login | Scanner, ink-dark background. Never a teacher screen |
| 4.2 | Allow camera | Live camera preview inside the frame |
| 4.3 | Point at a random QR (any website's) | Rejected. Proves detection works |
| 4.4 | **Point at the parent's live code** | Verdict screen, correct child, correct collector |
| 4.5 | Confirm handover | Success, returns to the scanner |
| 4.6 | Scan the *same* code again | Refused — already used |
| 4.7 | Hold the code steady for 5 seconds | **One** verdict screen, not a stack of them |
| 4.8 | Deny camera permission | Paste field still usable. The gate never depends on the camera |
| 4.9 | **Manual handover** | Reachable in one tap, asks a reason, says it is logged |

**4.4 has never run on real hardware.** It is the single most valuable step
here. **4.7** guards against a burst of duplicate scans — a barcode in frame
fires many times a second.

---

## T5 — Teacher

Clear the session, sign in as **teacher**.

| # | Do | Expect |
|---|---|---|
| 5.1 | Land after login | Class queue. Never the guard scanner |
| 5.2 | Check the roster | **Your class only.** Another class's children here is a leak |
| 5.3 | With a parent en route | The child appears, ordered by live ETA |
| 5.4 | **Mark at gate** | Status changes; the parent's queue position updates |

---

## T6 — The full chain, both phones

The one that proves the system. Parent on one phone, guard on the other.

| # | Do | Expect |
|---|---|---|
| 6.1 | Parent taps **On my way** | Trip starts |
| 6.2 | Move toward the school (or wait) | ETA falls |
| 6.3 | At ~2 minutes out | Classroom display speaks **once** |
| 6.4 | Same moment | **Parent's phone gets "Arriving now"** |
| 6.5 | Keep moving closer | The announcement does **not** repeat |
| 6.6 | Guard scans, confirms | Handover recorded |
| 6.7 | Immediately after | **Parent's phone: "…has been handed over to …"**, naming the collector |
| 6.8 | Admin → Audit log | Both events, with actor and time |

**6.4 and 6.7 have never been delivered to a real handset.** Push cannot be
tested in Expo Go at all — it receives FCM for Expo's Firebase project, never
for `rukhsat-87a43`. These need an installed APK.

**6.5 is the one that matters for a real dismissal.** Thirty arrivals across 90
minutes, announcing repeatedly, means everyone stops listening.

---

## T7 — Urdu and RTL

Every string exists in both languages already. What needs human eyes:

| # | Look for | On |
|---|---|---|
| 7.1 | Nastaliq descenders clipped by tight line-height | every screen |
| 7.2 | Rows that should mirror but do not | lists, headers, back buttons |
| 7.3 | Latin digits inside Urdu sentences reading awkwardly | ETA, queue position, times |
| 7.4 | English text still showing in Urdu mode | especially errors and empty states |
| 7.5 | Buttons whose Urdu label overflows or wraps badly | primary actions |

Walk all 37 screens in both languages. Screenshot anything that looks wrong.

**If you find English in Urdu mode, that is a bug** — the type system requires
both, so it means a literal was inlined instead of using the strings table.

---

## T8 — The gate run, 5+ phones

The one nothing else substitutes for. Everything above tests a path; this tests
a **school**.

| # | Scenario | Watching for |
|---|---|---|
| 8.1 | Five collectors tap **On my way** within a minute | Queue orders by live ETA, not booking time |
| 8.2 | One phone on poor signal | Their QR still works offline |
| 8.3 | One phone deliberately dead | Guard completes it manually. Nobody is turned away |
| 8.4 | A van with several children | One scan, then each child confirmed individually |
| 8.5 | Two guards scanning at once | No double handover, no lost record |
| 8.6 | Leave phones idle 15 minutes mid-trip | Tracking survives, or fails visibly rather than silently |

**8.6 is the endemic one.** OEM battery managers on Xiaomi, Oppo, Vivo and
Infinix kill foreground work aggressively. Turn battery optimisation off for
both apps before this run, and note whether it was needed — that is a real
finding for the deployment guide.

---

## What to send back

For each failure: the step number, what appeared on screen, and a screenshot.
For anything intermittent, note how many times out of how many attempts.

Both Metro terminals log JS errors, `adb logcat` covers native crashes, and the
API logs are on the server — so between the three, almost anything can be
traced from a clear description.
