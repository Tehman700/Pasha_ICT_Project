# CLAUDE.md — backend/

FastAPI backend for Rukhsat.

## Before starting

Read (from repo root): `docs/PROJECT_CONTEXT.md`, `docs/DATA_MODEL.md`, `docs/api/openapi.yaml`, `docs/SECURITY.md`.

## Suggested structure

```
backend/
├── app/
│   ├── main.py
│   ├── config.py                # pydantic-settings, reads .env
│   ├── db.py                    # SQLAlchemy engine/session
│   ├── models/                  # one file per table group
│   ├── schemas/                 # Pydantic request/response models
│   ├── routers/                 # one file per openapi.yaml tag
│   │   ├── auth.py
│   │   ├── schools.py
│   │   ├── students.py
│   │   ├── schedules.py
│   │   ├── pickup_requests.py
│   │   ├── trips.py
│   │   ├── queue.py             # includes the WebSocket endpoint
│   │   ├── qr.py
│   │   ├── handovers.py
│   │   ├── announcements.py
│   │   └── analytics.py
│   ├── services/                # geofence calc, ETA, token signing, queue ordering
│   └── jobs/                    # APScheduler jobs (nightly request generation, reminders)
├── alembic/
├── tests/
├── keys/                        # git-ignored except keys/README.md — see that file
├── requirements.txt
├── .venv/                       # not committed
└── CLAUDE.md
```

## Rules specific to this package

- Every router matches `docs/api/openapi.yaml` — same paths, same request/response shapes. If you need to diverge, update the contract file first and mention it, don't diverge silently.
- **One Alembic lineage.** Generate migrations from here only, and only when you know no one else is mid-migration. Two people autogenerating revisions against the same tables produces a history that cannot be merged.
- **Any migration adding a Postgres ENUM must drop it in `downgrade()`.** Alembic will not do this for you; the initial migration has the pattern. Skip it and one rollback bricks the database until someone drops the types by hand.
- Queue ordering logic (ETA-based, not booking-time-based) lives in `services/` — see `docs/PROJECT_CONTEXT.md` for why. Don't reintroduce booking-time ordering.
- Geofence evaluation is server-side, computed from streamed lat/lng — see `docs/SECURITY.md`. Don't move this to the client.
- QR token signing uses ES256 via **pyjwt** (not python-jose — unmaintained since 2021, open CVEs, and it would be signing the security core of a child-safety system). The private key never leaves the server.
- Local dev uses `docker compose -f docker-compose.dev.yml up -d` from the repo root: Postgres 16 on **5544**, Redis 7 on **6399**. Non-default ports on purpose — a native Postgres on 5432 silently wins over Docker’s proxy and the failure looks like a password error. Production remains fully native via systemd.

## Running locally

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```
