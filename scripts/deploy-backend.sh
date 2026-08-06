#!/usr/bin/env bash
#
# Deploys the Rukhsat FastAPI backend to /srv/rukhsat and runs it under
# systemd. Re-runnable: pulls, migrates, restarts.
#
# Secrets arrive as environment variables so they never land in the repo:
#   DB_PASSWORD  JWT_SECRET  REPO_URL
#
#   ssh ubuntu@<ip> 'sudo DB_PASSWORD=... JWT_SECRET=... bash /tmp/deploy-backend.sh'

set -euo pipefail

APP_DIR=/srv/rukhsat
REPO_URL="${REPO_URL:-https://github.com/Tehman700/Pasha_ICT_Project.git}"

log() { echo ""; echo "=== $* ==="; }

log "Source"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u ubuntu git -C "$APP_DIR" fetch --quiet origin
  sudo -u ubuntu git -C "$APP_DIR" reset --hard --quiet origin/main
  echo "updated to $(sudo -u ubuntu git -C "$APP_DIR" rev-parse --short HEAD)"
else
  sudo -u ubuntu git clone --quiet "$REPO_URL" "$APP_DIR"
  echo "cloned at $(sudo -u ubuntu git -C "$APP_DIR" rev-parse --short HEAD)"
fi

log "Environment file"
# 0600 and owned by ubuntu — it holds the database password and JWT secret.
sudo -u ubuntu tee "$APP_DIR/.env" > /dev/null <<EOF
DATABASE_URL=postgresql+psycopg://rukhsat_app:${DB_PASSWORD}@localhost:5432/rukhsat
REDIS_URL=redis://localhost:6379/0

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_SECONDS=86400

QR_SIGNING_PRIVATE_KEY_PATH=./keys/qr_private.pem
QR_SIGNING_PUBLIC_KEY_PATH=./keys/qr_public.pem
FCM_SERVICE_ACCOUNT_JSON_PATH=./keys/fcm-service-account.json

GEOFENCE_RADIUS_M=1000
ANNOUNCE_ETA_SECONDS=120
TRIP_MAX_MINUTES=90

ENVIRONMENT=production
CORS_ORIGINS=https://admin.tideover.site,https://api.tideover.site
EOF
chmod 600 "$APP_DIR/.env"
echo "written (0600)"

log "Python environment"
cd "$APP_DIR/backend"
if [ ! -d .venv ]; then
  sudo -u ubuntu python3 -m venv .venv
fi
# Some packages have no wheels for Python 3.14 yet and build from source;
# build-essential and libpq-dev are installed by provision-server.sh for this.
sudo -u ubuntu ./.venv/bin/pip install --quiet --upgrade pip
sudo -u ubuntu ./.venv/bin/pip install --quiet -r requirements.txt
echo "dependencies installed"

log "Database migration"
sudo -u ubuntu ./.venv/bin/alembic upgrade head 2>&1 | grep -E "Running upgrade|already at" || echo "already up to date"

log "systemd unit"
tee /etc/systemd/system/rukhsat-api.service > /dev/null <<'EOF'
[Unit]
Description=Rukhsat FastAPI backend
After=network.target postgresql.service redis-server.service
Requires=postgresql.service

[Service]
Type=exec
User=ubuntu
Group=ubuntu
WorkingDirectory=/srv/rukhsat/backend
EnvironmentFile=/srv/rukhsat/.env
# Two workers on a 1.9GB box. More would win nothing and cost memory that
# Postgres needs more.
ExecStart=/srv/rukhsat/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

# Hardening — the process needs nothing outside its own directory.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/srv/rukhsat

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable rukhsat-api >/dev/null 2>&1 || true
systemctl restart rukhsat-api
sleep 4

log "Status"
systemctl is-active rukhsat-api
curl -fsS --max-time 10 http://127.0.0.1:8000/health || echo "health check failed"
echo ""
