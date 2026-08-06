# Running the apps on your phone

All four surfaces run today with **no backend** — every screen is wired to a
typed mock layer. You need no AWS account, no database, and no Play Store
build to look at any of this.

**Good news for right now: you do not need a dev build.** Every dependency in
both mobile apps ships inside Expo Go for SDK 57, so scanning a QR code is
enough. (The two places that need a dev build later are noted at the bottom.)

---

## One-time setup

```bash
# from the repo root
pnpm install
```

Install **Expo Go** on each Android phone — Play Store → "Expo Go".

Your phone and your computer must be on the **same Wi-Fi network**. Phone
hotspot works; university/office networks with client isolation often do not
(see Troubleshooting).

---

## Parent app

```bash
pnpm dev:parent
```

A QR code appears in the terminal. Open **Expo Go → Scan QR code** and point it
at the terminal. First load takes 20–40 seconds while Metro bundles; after that
saves hot-reload in about a second.

**What to walk through**

1. **Sign in** — any phone number and password continue.
2. **Today's pickup** — Tariq Raza's two children, Ali (Nursery) and Zara
   (Prep A). Note both are being collected by *Ahmed Khan's van*, not by the
   parent. That is one trip covering a sibling group.
3. **Weekly schedule** — the van collects Monday–Thursday, the father on Friday.
   That is the per-weekday collector column doing its job.
4. **Who can collect my children** → **Add someone** — the two paths:
   *school-approved drivers* (vetted list) and *a relative or helper* (added
   directly by you). Then pick which children.
5. **On my way** → **Show pickup code** — the QR rotates every 60 seconds with a
   countdown bar, and shows how many pre-fetched tokens remain.
6. **اردو** in the top-right of any screen — the whole app switches to Urdu.

## Staff app

```bash
pnpm dev:staff        # runs on port 8082 so both can run at once
```

Two roles behind one login. The skeleton lets you pick a role on the login
screen; the real app routes automatically from your account, and a guard can
never reach teacher screens.

**Teacher**
- Prep list for Nursery, built from today's bookings — *not* queue order.
- Live queue, scoped to this teacher's class only.
- Mark children at the gate.

**Guard** — note this whole tree is **ink-inverted**, because it is read in
direct afternoon sun at a gate.
- **Simulate valid scan** → verdict screen with child photo beside collector
  photo. A green tick is not the handover; the guard still confirms visually.
- **Simulate van scan** → six children confirmed one at a time as they board.
- **Simulate expired code** → red verdict, which routes straight to manual.
- **Manual handover** → search a child, pick from their *authorized* collectors
  only, give a reason. Deliberately given equal visual weight to scanning.

## Admin dashboard + classroom display

```bash
pnpm dev:admin
```

- Dashboard: <http://localhost:3000>
- Classroom display: <http://localhost:3000/display/cls-nur>

**To view these on a tablet or phone**, find your computer's LAN address and
use that instead of `localhost`:

```bash
# Windows
ipconfig | findstr /i "IPv4"
# macOS / Linux
ipconfig getifaddr en0 || hostname -I
```

Then browse to `http://<that-ip>:3000` from the device.

The classroom display is built as a **web route on purpose** — pairing a
display becomes "open a URL" instead of "install an APK and pair it", and it
gets GSAP and the Web Audio API, neither of which exists in React Native. Put
the tablet's browser in full-screen/kiosk mode and it is done.

---

## Troubleshooting

**QR scan does nothing / stuck on "Downloading"** — phone and computer are not
reaching each other. Use a tunnel:

```bash
pnpm --filter @pickup/parent-app start --tunnel
```

Slower, but it works through client isolation, VPNs, and guest Wi-Fi.

**"Port 8081 already in use"** — you have another Metro running. `pnpm
dev:staff` already uses 8082; for anything else pass `--port`.

**Changes not appearing** — shake the phone → *Reload*. If Metro looks confused
after a dependency change, restart with `--clear`.

**Windows Firewall prompt on first run** — allow Node on **private** networks,
or the phone cannot reach Metro.

**Metro cannot find `@pickup/shared`** — the workspace uses hoisted node_modules
(`.npmrc` sets `node-linker=hoisted`) because Metro cannot follow pnpm's
symlinks. If you ever see this, run `pnpm install` from the repo root, not from
inside an app.

---

## What still needs a dev build (later, not now)

Two things are stubbed precisely so the skeleton runs in Expo Go:

| Stub | Needs | Module |
|---|---|---|
| Guard camera preview | `expo-camera` on a dev build | M7.3 |
| Parent map view | `react-native-maps` + a Google Maps SDK key | M4.5 |

When you get there:

```bash
npm install -g eas-cli
eas build --platform android --profile development
```

That build URL doubles as the direct-APK download link for testers, which is
the competition distribution plan — Play closed testing cannot unlock in time.

---

## Verifying the build yourself

```bash
pnpm verify     # typechecks all 5 packages, runs 22 tests, builds admin-web
```

To confirm the mobile apps compile all the way to a phone bundle:

```bash
cd apps/parent-app && npx expo export --platform android
cd apps/staff-app  && npx expo export --platform android
```

<!-- CI trigger check 230601 -->
