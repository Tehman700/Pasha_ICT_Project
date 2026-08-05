# Collaboration

## Ownership

- **Person A** — backend, database schema/migrations, admin web, infrastructure
- **Person B** — both mobile apps, the shared package, localization

Claude Code sessions should stay inside these lines. If you're working as Person B, treat `docs/api/openapi.yaml` as fixed and don't modify backend models or migrations — flag a needed contract change instead of silently working around it.

## Repo & branching

- `main` is always deployable
- Branch per feature: `feat/qr-verification`, `feat/parent-schedule-ui`
- Small, frequent PRs — even solo ones — rather than one big end-of-day merge. A conflict found the same day is nothing; one found on Day 6 is expensive.

## Local database

Both of you develop against **Person A's EC2 Postgres/Redis instance** rather than installing locally — this removes version-drift risk between two machines on a 1-week clock. Access via SSH tunnel or an IP-restricted port (Person A sets this up Day 0). Connection details go in your own `.env`, copied from `.env.example`.

One shared dataset means you can step on each other's test data — `scripts/seed.py` is safe to rerun any time you need a clean slate.

## Secrets

- `.env` is git-ignored. `.env.example` documents every variable with dummy values — commit that, never the real one.
- Real secrets (FCM service account key, JWT signing key, DB password, QR signing keypair) shared once via a password manager or Signal — not Slack, not WhatsApp, not committed anywhere.
- The same secrets are set as GitHub Actions repo secrets for deployment.

## API contract

`docs/api/openapi.yaml` is the agreed contract between backend and both frontends. Change it deliberately and tell the other person — it's what lets you build in parallel without blocking on each other's endpoints. Person B can build against a mock server matching the contract before Person A's real endpoint exists.

## CI/CD

GitHub Actions on push to `main` (see `.github/workflows/`):
- Backend: deploy via rsync/SSH → migrate → restart the systemd service
- Admin web: build → deploy via rsync/SSH → restart
- Mobile: EAS Build produces the APK automatically — this is also the direct-download link for testers, no manual APK wrangling
