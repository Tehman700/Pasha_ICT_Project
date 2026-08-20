# API integration

The backend is **not changing**. The apps are clients of an existing,
deployed, documented contract.

- Base URL: `https://api.tideover.site/v1`
- WebSocket: `wss://api.tideover.site/v1`
- Full contract: [`docs/api/openapi.yaml`](../api/openapi.yaml) — **the source
  of truth**. If this doc and that file disagree, the yaml wins and this doc
  needs fixing.

## Delete the Supabase layer first

The scaffold's `data/AuthRepository.kt` talks to **Supabase GoTrue** with
email + 6-digit OTP. Rukhsat has none of that. Deleting it is Phase 1's first
act, before any screen is rewritten, so nothing accidentally builds on it.

Three things follow from this and they are easy to miss:

1. **There is no OTP anywhere in Rukhsat.** The root `CLAUDE.md` constraint is
   *no SMS*. There is no email code either. `OtpScreen` becomes a password
   screen; `SignupViewModel`'s `code`, `secondsRemaining`, `canResend`, and
   `CODE_LENGTH` all go.
2. **Auth is phone + password.** Phone is normalised server-side, so
   `+923001234567`, `0300-1234567`, and `03001234567` all reach one account.
3. **There is no "simulated mode".** The backend is live. A build that appears
   to work while talking to nothing is worse than one that fails honestly.

## Auth

```
POST /auth/login          { phone, password }
  → 200 { access_token, token_type: "bearer", expires_in, user }
  → 401 "Incorrect phone number or password"   (same for unknown phone —
                                                deliberately not enumerable)
  → 403 "Account is disabled"
```

`user` is:

```kotlin
data class User(
    val id: String,          // uuid
    val schoolId: String,    // uuid
    val role: Role,          // PARENT | COLLECTOR | TEACHER | GUARD | ADMIN
    val name: String,
    val nameUr: String?,
    val phone: String,
    val locale: String,      // "en" | "ur"
    val photoUrl: String?,
)
```

Other auth endpoints:

```
GET   /users/me             → User
PATCH /users/me             { fcm_token?, ... } → User
```

`PATCH /users/me` is how the FCM token is registered. Call it after login and
on every token refresh, or push silently never works.

### Role gating

The login response's `role` decides which shell opens, and whether the app
opens at all:

| Flavor | Accepts | Refuses with |
|---|---|---|
| `parent` | `PARENT`, `COLLECTOR` | "This is the parent app. Staff should use Rukhsat Staff." |
| `staff` | `TEACHER`, `GUARD` | "This is the staff app. Parents should use Rukhsat." |

`ADMIN` uses the web dashboard and is refused by both.

### Token storage

Store `access_token` in **DataStore backed by `security-crypto`**, never plain
SharedPreferences. Track the `expires_in` deadline and treat any `401` as
"session over" — clear storage and return to the welcome screen. There is no
refresh token; re-login is the refresh.

## Registration

```
POST /auth/register/parent    → 201
POST /auth/register/driver    → 201
```

The parent registration matches a parent to their children **by CNIC**, never
by name — two "Muhammad Ali" guardians in one school is a false positive that
hands one man another man's children. Store CNIC as **digits only** (13), with
formatting applied at the input layer.

The driver registration takes `cnic`, `selfie_url`, `id_photo_url`, and
`school_id`. A driver lands in the database **linked to nothing and visible to
nobody** until a parent chooses him. There is no admin approval queue.

Supporting calls:

```
GET  /schools/public        → schools, for the registration picker (unauthenticated)
POST /uploads              → returns a URL for selfie / ID photo / profile photo
```

## Parent flavor

### Home
```
GET /me/children           → [Student]
GET /me/schedules          → [Schedule]
GET /me/collectors         → [Authorization]
GET /me/children-pickups   → [PickupRequest]   today's state per child
GET /announcements
```

### Collectors — grant and revoke
```
GET    /collectors/lookup?phone=…          resolve a phone to a registered collector
GET    /students/{student_id}/collectors   who may collect this child
POST   /students/{student_id}/collectors   { collector_user_id, kind, valid_from, valid_until? }
DELETE /students/{student_id}/collectors/{id}   revoke
```

**There is no student search endpoint for collectors, and one must never be
added.** The search itself is the leak — even a zero-result query confirms
whether a child is enrolled. A collector is *granted* access by a parent; he
never looks a child up. This is in the root `CLAUDE.md` and it is not
negotiable.

`/collectors/lookup` is the safe inverse: a **parent** resolves a phone number
they already know to a collector account.

### Schedule
```
GET  /schedules
POST /schedules
POST /pickup-requests/{id}/exception   "not today" / someone else is coming
```

The schedule is the backstop. Geofences fire late or not at all on the Xiaomi,
Oppo, Vivo and Infinix handsets that dominate this market — the driver's own
declared arrival time is what makes the system work on the days the clever
thing fails. Treat the schedule UI as primary, not as a fallback.

### Collector trip — "On my way"

```
POST /trips/start                  → Trip     (201, or resumes today's open trip)
POST /trips/{trip_id}/location     { lat, lng, … }   while the screen is open
POST /trips/{trip_id}/end          → 204
GET  /me/trip                      current trip, if any
GET  /me/manifest                  → [PickupRequest]   who is being collected
GET  /me/queue-entry               position at the gate
```

**Tracking begins on this tap and nowhere else. Consent is the tap, not a
checkbox at install time.** Location streams only while the trip screen is
open, stops on `end`, and never runs in the background. `POST /trips/start`
returns `409` when there are no pickups scheduled today — surface that plainly
rather than as a generic failure.

Re-tapping "On my way" resumes an open trip rather than erroring, because a
collector may have force-closed the app mid-journey.

### QR display
```
POST /qr-tokens/batch   { trip_id, count }   → [ { token, iat, exp, jti }, … ]
```

Fetched **once** when the trip starts, over whatever signal the collector has
at home. After that the phone rotates through the batch locally and the gate
works with no signal at all.

- Each token is valid **90 seconds**; the phone advances every **60**.
- **Size the batch to the trip window, not to a round number.** 20 tokens is
  20 minutes; a collector waiting 25 minutes at the gate would run out of
  codes in exactly the offline scenario this exists for. Request enough to
  cover the expected wait, and re-batch if the trip runs long and signal allows.
- Render with ZXing; never fetch an image for a code.
- **The code must never be static.** Root `CLAUDE.md` constraint.

## Staff flavor

### Teacher — the queue
```
GET  /queue?class_id=…                  → queue state
GET  /pickup-requests?…                 → [PickupRequest]
POST /pickup-requests/{id}/stage        child brought to the gate
WS   /ws/queue/{class_id}?token=…       live updates
WS   /ws/classroom/{class_id}?token=…   classroom display
```

The WebSocket authenticates by **`token` query parameter**, not a header.
It sends `{type: "snapshot"}` first, then `{type: "update"}`, with
`{type: "ping"}` keepalives. Close code `4401` means the token was rejected —
treat it as a session error, not a network blip, and do not reconnect in a loop.

### Guard — scan and verdict

```
POST /qr-tokens/verify   { token, device_id }   server-side check, when online
POST /handovers          record a completed handover
POST /handovers/sync     flush the offline queue
GET  /handovers          history
POST /passes/verify      one-off / visitor passes
```

#### Offline verification — the part that must be right

The guard app verifies **offline, against a cached public key**. It does not
call the server to decide.

The token is a JWT signed **ES256** (P-256, `SHA256withECDSA`). Payload:

```json
{
  "rq":  "<trip uuid>",
  "gid": "<collector uuid>",
  "sch": "<school uuid>",
  "sid": ["<student uuid>", …],
  "iat": 1755000000,
  "exp": 1755000090,
  "jti": "<unique per token>"
}
```

Verification steps, all local:

1. Split the JWT, base64url-decode header and payload.
2. Verify the signature with the cached school public key.
   `java.security.Signature.getInstance("SHA256withECDSA")` — **no JWT library
   needed.** Note the signature is in JOSE **raw R‖S** form and must be
   converted to DER before `Signature.verify()` accepts it; this is the single
   most common way an otherwise-correct ES256 check fails.
3. Check `sch` matches the guard's own school.
4. Check `exp`/`iat` allowing **±60s clock skew** — cheap Android phones drift,
   and a guard whose clock is 40 seconds fast must not reject every valid code.
5. Check `jti` is not in today's locally-stored redeemed set. **This is what
   stops a forwarded screenshot being used twice inside its 90-second window.**
6. Record the `jti` on a successful handover.

Why ES256 and not HS256: HMAC verification needs the *signing* secret, so
every guard phone would hold the key that mints valid codes for any child in
the school. With ES256 the guard holds only the public key — enough to verify,
useless for forging.

#### A green verdict is not the handover

Software proposes; a person decides. After a valid scan the guard still sees
the child's photo and the collector's photo and confirms with his own eyes.

#### Manual fallback is mandatory

A failed scan — expired code, dead camera, flat collector battery, no signal —
**must** route to a logged manual handover. Software must never be the reason a
real handover cannot happen. This is a root `CLAUDE.md` constraint and the
single most important thing to get right in the guard app.

Manual handovers are written to Room immediately and synced via WorkManager
against `POST /handovers/sync` when signal returns.

## Error handling

| Status | Meaning | UI |
|---|---|---|
| `401` | Session over | Clear tokens, return to welcome. Never a toast. |
| `403` | Wrong role, or not your resource | Explain plainly. |
| `404` | Gone | Refresh the list rather than showing an empty detail screen. |
| `409` | Conflict — e.g. no pickups today | Surface the server's own message; it is written for the user. |
| `5xx` / no network | Backend or signal | Retry affordance. Never silently swallow. |

FastAPI returns `{"detail": "…"}`. Those strings are user-facing and
deliberately worded — show them rather than replacing them with a generic
message. They are English-only, which matches the apps, so they can be shown
as-is; see [I18N.md](I18N.md).
