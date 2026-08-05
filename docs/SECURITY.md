# Security Design

This is a child-safety system. These rules are not suggestions — treat any change to them as something that needs explicit discussion before implementing, not a decision to make silently mid-task.

## QR verification

- Parent app generates a fresh signed token roughly every 60 seconds. Never a static QR — a screenshot of a static code can be forwarded to anyone.
- Token shape:
  ```json
  {
    "rq":  "pickup_request_uuid",
    "sid": ["student_uuid_1", "student_uuid_2"],
    "gid": "guardian_uuid",
    "sch": "school_uuid",
    "iat": 1754400000,
    "exp": 1754400090,
    "jti": "nonce"
  }
  ```
- Signed **ES256** with the school's private key, held server-side only.
- Parent app pre-fetches a batch (~20 tokens) when the trip starts, so it keeps working with no signal at the gate.
- Guard app holds only the **public key** and today's roster, cached locally.
- Guard app verifies **fully offline**: signature valid → `exp` not passed (90s window, ±60s clock skew) → `jti` not already used today on this device → student on today's roster and staged → display both photos → guard confirms visually → tap Confirm.
- Handover is queued locally and synced when connectivity returns. **The gate never blocks on the network.**
- Direction is fixed: parent **displays**, guard **scans**. Never reversed.

## Location privacy

- **No background location permission, anywhere, in the MVP.** This is the single biggest Play Store review risk and we're not taking it.
- Tracking starts only on an explicit "On my way" tap — consent is an action, not a checkbox.
- Tracking auto-stops on handover or after 90 minutes.
- Teachers see only their own class's parents, and only during an active trip. Not a standing view of anyone's location.
- Raw location history purged after 24 hours; only `entered_geofence_at` and `arrived_at` are retained long-term.
- Permissions requested: `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`, `CAMERA` (guard role only).

Week-one implementation uses `watchPositionAsync` while the app is open — foreground only, no service. A post-competition upgrade to a persistent foreground service (for backgrounding survival) requires a `FOREGROUND_SERVICE_LOCATION` Play declaration — deliberately deferred past week one.

## Manual fallback — mandatory, not optional

Dead phone. Cracked camera. No signal. A grandmother who's never used the app.

**Rule: software must never block a real child handover.**

```
Search student by name
  → show authorized guardian list with photos
  → guard selects who is present
  → select reason: [phone dead] [no app] [scan failed] [other]
  → confirm → logged as method=MANUAL with guard identity + timestamp
```

Manual handovers are flagged on the admin dashboard for review. This is a designed-in strength, not a hidden weakness — present it as such.

## Play Store policy

**Do not declare either app as targeting children.** Users are adults — parents, teachers, guards. A children's-audience declaration triggers Google's Families Policy, which is far stricter and would block launch.
