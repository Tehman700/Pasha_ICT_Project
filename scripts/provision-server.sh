#!/usr/bin/env bash
#
# Provisions the Rukhsat production box from a blank Ubuntu 26.04 install.
#
# No Docker. Postgres, Redis, FastAPI and Next.js all run natively under
# systemd, behind Caddy for automatic HTTPS. See docs/DEPLOYMENT.md.
#
# Safe to re-run: every step checks before acting.
#
#   scp -i key.pem scripts/provision-server.sh ubuntu@<ip>:/tmp/
#   ssh -i key.pem ubuntu@<ip> 'sudo bash /tmp/provision-server.sh'

set -euo pipefail

log() { echo ""; echo "=== $* ==="; }

# ─────────────────────────────────────────────────────────────────────────
# Swap.
#
# This box has 1.9GB RAM and must run Postgres + Redis + FastAPI + Next.js.
# Without swap the kernel's OOM killer picks a victim under load, and it
# tends to pick Postgres. 2GB of swap is the difference between "slow for a
# moment" and "the database died mid-demo".
# ─────────────────────────────────────────────────────────────────────────
log "Swap"
if swapon --show | grep -q '/swapfile'; then
  echo "already configured"
else
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Only swap when genuinely short of memory — this is a database host.
  sysctl -w vm.swappiness=10 >/dev/null
  grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
  echo "2GB swapfile active"
fi

log "System packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl ca-certificates gnupg lsb-release ufw \
  build-essential libpq-dev python3-venv python3-dev acl >/dev/null
echo "base packages installed"

# ─────────────────────────────────────────────────────────────────────────
# PostgreSQL 18 from the PGDG repo.
#
# Ubuntu's own repo lags, and local development is pinned to 18 — testing a
# migration against a different major version than production runs is how a
# migration passes locally and fails on deploy.
# ─────────────────────────────────────────────────────────────────────────
log "PostgreSQL 18"
if ! command -v psql >/dev/null 2>&1; then
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
  CODENAME="$(lsb_release -cs)"
  # PGDG may not publish for a brand-new Ubuntu codename yet; fall back to
  # the most recent LTS it does publish for.
  if ! curl -fsI "https://apt.postgresql.org/pub/repos/apt/dists/${CODENAME}-pgdg/Release" >/dev/null 2>&1; then
    echo "PGDG has no ${CODENAME} repo yet — falling back to noble"
    CODENAME="noble"
  fi
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt/ ${CODENAME}-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -qq
  apt-get install -y -qq postgresql-18 postgresql-client-18 >/dev/null
  echo "installed: $(psql --version)"
else
  echo "already installed: $(psql --version)"
fi

log "PostgreSQL tuning for 2GB RAM"
PGCONF="/etc/postgresql/18/main/conf.d/rukhsat.conf"
install -d "$(dirname "$PGCONF")"
cat > "$PGCONF" <<'EOF'
# Sized for a 1.9GB instance also running Redis, FastAPI and Next.js.
# Defaults assume the database owns the machine; here it does not.
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 64MB
work_mem = 4MB
max_connections = 50
# The app connects over localhost only; Caddy is the sole public entrypoint.
listen_addresses = 'localhost'
EOF
systemctl restart postgresql
echo "tuned and restarted"

log "Redis"
if ! command -v redis-server >/dev/null 2>&1; then
  apt-get install -y -qq redis-server >/dev/null
fi
systemctl enable --now redis-server >/dev/null 2>&1 || true

# Configure via redis-cli + CONFIG REWRITE rather than editing redis.conf.
# Ubuntu's package has no conf.d include directory, and appending a heredoc
# to redis.conf over SSH is fragile — CONFIG REWRITE writes the running
# values back into the real config file, so the setting survives a restart.
#
# Redis here is a cache (live locations) and a pub/sub bus, never a store, so
# cap it and let it evict rather than compete with Postgres for RAM.
redis-cli config set maxmemory 128mb >/dev/null
redis-cli config set maxmemory-policy allkeys-lru >/dev/null
redis-cli config rewrite >/dev/null
echo "installed and capped at 128mb: $(redis-server --version | sed 's/.*v=\([0-9.]*\).*/\1/')"

log "Node 22 LTS"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs >/dev/null
fi
echo "node $(node --version), npm $(npm --version)"
npm install -g pnpm@10 >/dev/null 2>&1 || true
echo "pnpm $(pnpm --version 2>/dev/null || echo 'not installed')"

# ─────────────────────────────────────────────────────────────────────────
# Caddy.
#
# NOT in Ubuntu's default apt repo — DEPLOYMENT.md's `apt install caddy`
# fails as written. It needs its own repository.
# ─────────────────────────────────────────────────────────────────────────
log "Caddy"
if ! command -v caddy >/dev/null 2>&1; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -qq
  apt-get install -y -qq caddy >/dev/null
fi
echo "installed: $(caddy version)"

log "Application database"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='rukhsat_app'" | grep -q 1 || \
  sudo -u postgres psql -qc "CREATE USER rukhsat_app WITH PASSWORD '${DB_PASSWORD:-changeme}'"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='rukhsat'" | grep -q 1 || \
  sudo -u postgres psql -qc "CREATE DATABASE rukhsat OWNER rukhsat_app"
# GRANT ALL PRIVILEGES ON DATABASE is NOT sufficient on PG15+ — Alembic fails
# with "permission denied for schema public" without this second grant.
sudo -u postgres psql -d rukhsat -qc "GRANT ALL ON SCHEMA public TO rukhsat_app"
sudo -u postgres psql -d rukhsat -qc "ALTER SCHEMA public OWNER TO rukhsat_app"
echo "database 'rukhsat' owned by 'rukhsat_app'"

log "Application directory"
install -d -o ubuntu -g ubuntu /srv/rukhsat
echo "/srv/rukhsat ready"

log "Summary"
free -h | awk '/Mem:|Swap:/{printf "  %-6s %s total, %s used, %s free\n", $1, $2, $3, $4}'
echo "  services:"
for s in postgresql redis-server caddy; do
  printf "    %-14s %s\n" "$s" "$(systemctl is-active $s 2>/dev/null)"
done
echo ""
echo "Provisioning complete."
