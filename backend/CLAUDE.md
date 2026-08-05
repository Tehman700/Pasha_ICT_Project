# CLAUDE.md — backend/

FastAPI backend. Owned by Person A.

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
- **Migrations only from this codebase, only by Person A's sessions.** Two people generating Alembic migrations against the same tables from different sessions is how you get unmergeable migration history.
- Queue ordering logic (ETA-based, not booking-time-based) lives in `services/` — see `docs/PROJECT_CONTEXT.md` for why. Don't reintroduce booking-time ordering.
- Geofence evaluation is server-side, computed from streamed lat/lng — see `docs/SECURITY.md`. Don't move this to the client.
- QR token signing uses ES256 via `python-jose`; the private key never leaves the server. See `docs/SECURITY.md` for the exact token shape.
- Local dev connects to the shared EC2 Postgres/Redis instance per `docs/COLLABORATION.md`, not a locally-installed database.

## Running locally

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```
