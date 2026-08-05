# Deployment — Native Services on One EC2 Box

No Docker. Postgres, Redis, FastAPI, and Next.js all run directly on one instance, managed by systemd, behind Caddy for automatic HTTPS.

## 1. Provision

- EC2 t3.small or t4g.small (ARM is cheaper) — Ubuntu 24.04
- Set an **AWS Budget alert at $20** before doing anything else
- Point a subdomain of your existing domain at the instance's IP

## 2. Install services

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib redis-server \
                     python3-pip python3-venv nodejs npm

# Postgres: create the app database and user
sudo -u postgres psql -c "CREATE DATABASE pickup;"
sudo -u postgres psql -c "CREATE USER pickup_app WITH PASSWORD 'CHANGE_ME';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pickup TO pickup_app;"

# Redis: default config is fine for MVP, just enable on boot
sudo systemctl enable --now redis-server
```

To let both developers' machines reach Postgres/Redis directly for local dev (per `docs/COLLABORATION.md`), edit `postgresql.conf` / `pg_hba.conf` to listen beyond localhost, and restrict access at the **AWS security group level to your two IPs only** — never open these ports to `0.0.0.0/0`.

## 3. Caddy (reverse proxy + automatic HTTPS)

```bash
sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:
```
api.yourschool-subdomain.com {
    reverse_proxy localhost:8000
}

admin.yourschool-subdomain.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

Caddy handles Let's Encrypt certificate issuance and renewal automatically — no manual cert management.

## 4. systemd units

`/etc/systemd/system/backend.service`:
```ini
[Unit]
Description=FastAPI backend
After=network.target postgresql.service redis-server.service

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/school-pickup-system/backend
Environment="PATH=/home/ubuntu/school-pickup-system/backend/.venv/bin"
EnvironmentFile=/home/ubuntu/school-pickup-system/backend/.env
ExecStart=/home/ubuntu/school-pickup-system/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/admin-web.service`:
```ini
[Unit]
Description=Next.js admin dashboard
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/school-pickup-system/apps/admin-web
EnvironmentFile=/home/ubuntu/school-pickup-system/apps/admin-web/.env
ExecStart=/usr/bin/npm run start
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now backend admin-web
```

## 5. Deploy on push

`.github/workflows/deploy-backend.yml` and `deploy-admin-web.yml` rsync changed files to the box over SSH and restart the relevant service, triggered by path filters so each only runs when its own directory changes. Add these as GitHub repo secrets: `EC2_HOST`, `EC2_SSH_KEY`, `EC2_USER`.

## 6. Logs

```bash
journalctl -u backend -f
journalctl -u admin-web -f
```

Set CloudWatch log retention to 7 days if you enable it at all — default retention is forever and quietly burns credits.

## 7. Mobile builds

APKs are built via **EAS Build** (Expo's cloud build service), not locally — this avoids Android SDK/keystore setup on two different dev machines and gives a shareable build URL directly, which doubles as the "direct APK download" link for testers.

```bash
npm install -g eas-cli
eas build --platform android --profile preview
```
