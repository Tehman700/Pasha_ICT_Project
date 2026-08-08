# Security Design

This is a child-safety system. The security model *is* the project, not a
feature of it. Treat any change here as needing explicit discussion, not a
decision to make silently mid-task.

## The one rule everything else follows from

> **A collector can never claim a child. Only a parent grants access to their
> own children** — or an admin does, by phone, with it logged and visible to
> the parent.

Every other rule below is a consequence of this one.

## Who may collect a child

| Type | How they get access | Scope |
|---|---|---|
| Parent | Self-registers, matched on **CNIC** | Their own children |
| Driver | Self-registers, then **a parent links him** | Only children whose parents linked him |
| Relative / helper | Added directly by a parent | That parent's children |
| One-off outsider | Temporary pass issued by a parent | One child, one day |

**The school vets nobody.** A driver is a private commercial contract between a
parent and a driver. He self-registers, lands in the database linked to nothing
and visible to no school, and appears only once a parent links him — and then
only through that parent's children. Asked who approved this man, the answer is
*"the parent did, on this date, here is the log"*, never *"the school did."*

Status is **derived** from live authorizations, never stored. A stored
`ASSIGNED` flag drifts: revoke the last link and it would leave a driver
visible to a school he no longer serves.

**Photos are verified by the parent, by eye.** There is no automated face
match. She knows what the man she hired looks like, and an algorithm reporting
"82%" is worse than a person looking at a picture.

## CNIC, not name

Name matching fails in both directions, but only one is dangerous:

- *"Muhammad Aslam Khan"* / *"M. Aslam"* — one man, three strings. A **false
  negative**: annoying.
- Two *"Muhammad Ali"* guardians in a 300-student school — a **false positive**
  that hands one man another man's children.

The second is why this is not a close call, and why an unmatched parent phones
the school rather than being matched loosely. The manual link is logged as
`manual_link` with the admin's name, and the parent sees it in her app — if she
did not make that call, she finds out immediately.

## No student search for collectors

> **There is no student search endpoint for collectors. Not restricted, not
> paginated — none.**

The search *is* the leak. Even a zero-result query confirms whether a child
attends the school. An endpoint that does not exist cannot be called with a
broken role check, which is why the guard is on the route rather than a filter
inside the handler.

A driver's only view of student data is `GET /me/manifest` — the children whose
parents linked him, today. **Being authorized to *collect* a child is not the
same as being allowed to *read* their record.** He needs a name and a face at
the gate; he does not need the roster, the guardians' phone numbers, or
confirmation of who is enrolled.

## QR verification

- Tokens rotate roughly every 60 seconds. Never static — a static code can be
  screenshotted and forwarded, which defeats the entire premise.
- Signed **ES256** with the school's private key, which never leaves the server.
- **ES256, not HS256, for a specific reason.** HMAC verification needs the
  secret, so every guard phone would hold the key that *mints* valid codes. One
  stolen guard phone could then forge a token for any child in the school. With
  ES256 the guard holds only the public key: enough to verify, useless to forge.
- The collector's app pre-fetches a batch **sized to the trip window** (90
  tokens ≈ 90 minutes), not a round number. 20 tokens is ~20 minutes, and a
  collector waiting longer would run out in exactly the offline case this
  exists for.
- Verified **fully offline**: signature → `exp` (90s window, ±60s clock skew,
  because cheap Android clocks drift) → `jti` not already used today → child on
  today's roster → **both photos shown → guard confirms by eye**.
- Direction is fixed: the collector **displays**, the guard **scans**. Never
  reversed.

**A valid signature is necessary, not sufficient.** A token minted before a
parent revoked access is still cryptographically perfect. Authorization is
re-checked per child at scan time, and the verdict screen shows a green tick on
the code beside a refusal on the child.

## The one-off pass

The only QR issued to someone with no account.

**The photo is mandatory.** A pass sent over WhatsApp is a forwardable image:
screenshot it, forward it, leave a phone unlocked in a shop. With the photo,
the guard is looking at a picture of the man in front of him while the child
walks across the yard — one field, no extra taps, and the child stops walking
out on a forwarded screenshot.

Issued without a photo it still works, but the guard's screen says *"No photo —
verify name and phone"* and the audit entry is flagged. **Degraded, not blind.**

Single use, expires at midnight, burns the moment the child is collected.

## Automate the announcement, never the release

A valid scan fires the speaker automatically — the guard presses nothing, and
the child starts walking while he checks the photo. **A human still matches a
face before a child leaves.** Software proposes; a person decides.

## Manual fallback — mandatory

Dead phone. Cracked camera. No signal. A grandmother who has never used an app.

> **Software must never be the reason a real handover cannot happen.**

```
Search child by name (guard only)
  → that child's authorized collectors, with photos
  → guard picks who is present
  → reason: [phone dead] [no app] [scan failed] [other]
  → confirm → logged as method=MANUAL with guard identity + device + timestamp
```

**Manual does not mean unchecked.** Authorization is enforced identically to a
scan — it means the QR could not be read, not that the check was waived. The
guard chooses only from *that child's* approved collectors.

Manual handovers surface flagged for review. That is a designed-in strength to
present, not a weakness to hide.

## Location privacy

- Tracking starts only on an explicit tap. Consent is an action, not a checkbox.
- Auto-stops on handover or after 90 minutes, enforced server-side so a
  forgotten app cannot stream forever.
- Raw fixes live in Redis under a **24-hour TTL**, so the retention rule is
  enforced by the store rather than by a job somebody has to remember to run.
  Only `entered_geofence_at` and `arrived_at` survive.
- Teachers see only their own class, and only during an active trip.
- Permissions: `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`, `CAMERA` (guard).

**On background location:** `app.json` currently blocks
`ACCESS_BACKGROUND_LOCATION`. Google's policy does list child-safety
geofencing among approved uses, so this is revisitable — but note that for the
*van* case the located party is a commercial contractor, which reviews closer
to fleet tracking than family safety. Competition delivery is a direct APK,
which needs no Play review at all.

## The schedule is the backstop

Geofences fire late or not at all. OEM battery managers on Xiaomi, Oppo, Vivo
and Infinix are endemic in this market and kill background apps aggressively.

The driver's own declared arrival time (`vehicles.expected_arrival`) is
therefore the **backbone**, not a fallback. When the clever thing fails, the
system falls back to what the school does today: a time.

## Play Store policy

**Do not declare either app as targeting children.** Users are adults —
parents, teachers, guards, drivers. A children's-audience declaration triggers
Google's Families Policy, which is far stricter and would block launch.
