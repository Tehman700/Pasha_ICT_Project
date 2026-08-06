#!/usr/bin/env bash
#
# Deploys the Next.js admin dashboard (and the classroom display route) to
# /srv/rukhsat and runs it under systemd behind Caddy.
#
# Re-runnable: pulls, installs, builds, restarts.
#
#   ssh ubuntu@<ip> 'sudo bash /tmp/deploy-admin-web.sh'

set -euo pipefail

APP_DIR=/srv/rukhsat
WEB_DIR="$APP_DIR/apps/admin-web"

log() { echo ""; echo "=== $* ==="; }

log "Source"
sudo -u ubuntu git -C "$APP_DIR" fetch --quiet origin
sudo -u ubuntu git -C "$APP_DIR" reset --hard --quiet origin/main
echo "at $(sudo -u ubuntu git -C "$APP_DIR" rev-parse --short HEAD)"

log "Web environment"
sudo -u ubuntu tee "$WEB_DIR/.env.production" > /dev/null <<'EOF'
NEXT_PUBLIC_API_URL=https://api.tideover.site/v1
NEXT_PUBLIC_WS_URL=wss://api.tideover.site/v1
EOF
echo "written"

log "Dependencies"
cd "$APP_DIR"
# --prod would drop the build toolchain Next needs, so install everything.
sudo -u ubuntu pnpm install --frozen-lockfile --silent 2>&1 | tail -3 || \
  sudo -u ubuntu pnpm install --silent 2>&1 | tail -3
echo "installed"

log "Build"
# This box has 1.9GB of RAM shared with Postgres, Redis and the API. Next's
# build is the memory spike in the whole deployment — left uncapped it can
# push the machine into swap thrash or trip the OOM killer, which on this box
# tends to take Postgres with it. 1GB heap is comfortably enough for 16 routes.
sudo -u ubuntu env NODE_OPTIONS="--max-old-space-size=1024" \
  pnpm --filter @pickup/admin-web build 2>&1 | tail -12

log "systemd unit"
tee /etc/systemd/system/rukhsat-admin.service > /dev/null <<'EOF'
[Unit]
Description=Rukhsat admin dashboard (Next.js)
After=network.target rukhsat-api.service

[Service]
Type=exec
User=ubuntu
Group=ubuntu
WorkingDirectory=/srv/rukhsat/apps/admin-web
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
# `npm run start` fails if the build has never run — DEPLOYMENT.md omitted
# that step. The build happens above, before this unit is (re)started.
ExecStart=/usr/bin/npx next start --port 3000 --hostname 127.0.0.1
Restart=always
RestartSec=5

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/srv/rukhsat

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable rukhsat-admin >/dev/null 2>&1 || true
systemctl restart rukhsat-admin
sleep 8

log "Status"
systemctl is-active rukhsat-admin
curl -fsS -o /dev/null -w "  localhost:3000 -> HTTP %{http_code}\n" --max-time 15 http://127.0.0.1:3000/ || echo "  not responding yet"
free -h | awk '/Mem:|Swap:/{printf "  %-6s %s total, %s used\n", $1, $2, $3}'
