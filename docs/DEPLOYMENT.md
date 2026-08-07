# Deployment — Native Services on One EC2 Box

**Status: live.** `https://api.tideover.site` and `https://admin.tideover.site`
are running the stack described below.

No Docker in production. Postgres, Redis, FastAPI and Next.js all run directly
on one instance under systemd, behind Caddy for automatic HTTPS. (Docker *is*
used for local development databases — see `docker-compose.dev.yml`. That is a
developer convenience and never touches the server.)

Everything here is automated in three scripts. Prefer running those over
following steps by hand:

| Script | Does |
|---|---|
| `scripts/provision-server.sh` | Blank Ubuntu → full stack. Re-runnable. |
| `scripts/deploy-backend.sh` | Pull, migrate, restart the API. |
| `scripts/deploy-admin-web.sh` | Pull, build, restart the dashboard. |

## 1. What is actually running

| | |
|---|---|
| Instance | `i-0f2086cc09c7ad6f5`, t3.small, ap-south-1b |
| Elastic IP | `13.205.248.87` |
| OS | Ubuntu 26.04 LTS |
| PostgreSQL | 18.4 (PGDG repo) |
| Redis | 8.10 |
| Node | 22 LTS |
| Caddy | 2.11 |
| App root | `/srv/rukhsat` |
| Services | `rukhsat-api` (:8000), `rukhsat-admin` (:3000), `postgresql`, `redis-server`, `caddy` |

DNS is at **Namecheap** (`dns1/dns2.registrar-servers.com`), with `api` and
`admin` A records pointing at the Elastic IP.

## 2. Sizing — this box has 1.9 GB of RAM

Four services share it, so the defaults do not fit. `provision-server.sh` sets:

- **2 GB swap**, `vm.swappiness=10`. Without swap the OOM killer picks a victim
  under load and it tends to pick Postgres.
- **Postgres**: `shared_buffers=256MB`, `effective_cache_size=768MB`,
  `work_mem=4MB`, `max_connections=50`. Defaults assume the database owns the
  machine; here it does not.
- **Redis**: `maxmemory 128mb`, `allkeys-lru`. It is a cache and a pub/sub bus,
  never a store, so it should evict rather than compete with Postgres.
- **Uvicorn**: 2 workers. More wins nothing and costs memory Postgres needs.
- **Next build**: `NODE_OPTIONS=--max-old-space-size=1024`. The build is the
  single largest memory event on the machine.

## 3. Security

- **SSH is closed to the internet**, allowed only from known developer IPs.
  Add one with:
  ```bash
  aws ec2 authorize-security-group-ingress --group-id sg-0c5a68de07153ba87 \
    --ip-permissions 'IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=<IP>/32,Description="name"}]'
  ```
  If your ISP rotates your address and you get locked out, **EC2 Instance
  Connect** in the console still works as a back door.
- Ports **80 and 443 only** are public. Postgres and Redis bind to `127.0.0.1`,
  so Caddy is the sole public entrypoint.
- The API and dashboard both bind to `127.0.0.1` too — they are unreachable
  except through Caddy.
- `/srv/rukhsat/.env` is `0600` and holds the database password and JWT secret.
  Both systemd units run with `NoNewPrivileges` and `ProtectSystem=strict`.

## 4. Four things that fail as written elsewhere

These cost real time; they are fixed in the scripts but worth knowing.

**`apt install caddy` does not work.** Caddy is not in Ubuntu's default repos
and needs its own.

**`GRANT ALL PRIVILEGES ON DATABASE` is not enough on PG15+.** Alembic dies with
*permission denied for schema public*. You also need:
```sql
GRANT ALL ON SCHEMA public TO rukhsat_app;
ALTER SCHEMA public OWNER TO rukhsat_app;
```

**Caddy cannot write log files.** Its systemd unit sets `ProtectSystem`, making
`/var/log` read-only to the service. A `log { output file ... }` block makes
Caddy **fail to start entirely** — not degrade quietly. Creating the directory
and chowning it to `caddy` does not help. Logs go to journald:
`journalctl -u caddy -f`.

**Redis ignores config appended over SSH.** Ubuntu's package has no `conf.d`
include, and a heredoc appended to `redis.conf` can leave `maxmemory` at `0`
while every command reports success. Use `redis-cli config set` followed by
`config rewrite`, which writes running values back to the real file.

## 5. Deploying

Deployment is by script, run from a machine whose IP is allowed through the
security group:

```bash
scp -i <key>.pem scripts/deploy-backend.sh ubuntu@13.205.248.87:/tmp/
ssh -i <key>.pem ubuntu@13.205.248.87   "sudo DB_PASSWORD='...' JWT_SECRET='...' bash /tmp/deploy-backend.sh"

scp -i <key>.pem scripts/deploy-admin-web.sh ubuntu@13.205.248.87:/tmp/
ssh -i <key>.pem ubuntu@13.205.248.87 "sudo bash /tmp/deploy-admin-web.sh"
```

Both are re-runnable: pull, build, migrate, restart.

**There is no GitHub Actions pipeline.** It was built and worked for deploys,
but GitHub stopped triggering runs on this repository for reasons not visible
from the API — workflows stayed `active`, pushes registered as events, and no
run started. Rather than keep a pipeline nobody can trust, the checks moved to
`pnpm verify`, which runs locally before every push and does strictly more than
CI did (it includes the migration round-trip).

Run this before pushing anything:

```bash
pnpm verify
```

  typecheck (5 packages) → migration round-trip → 73 tests → admin build

## 6. Operating it

```bash
ssh -i <key>.pem ubuntu@13.205.248.87

systemctl status rukhsat-api rukhsat-admin caddy postgresql redis-server
journalctl -u rukhsat-api -f
journalctl -u caddy -f

# reseed the demo dataset
cd /srv/rukhsat/backend && ./.venv/bin/python ../scripts/seed.py --reset
```

Health check: `curl https://api.tideover.site/health` → should report
`database: ok, redis: ok`.

## 7. Cost

`t3.small` is **not** free-tier eligible (only `t3.micro` is) and runs roughly
$15/month against the $200 credit balance. The Elastic IP is free **while
attached to a running instance** and billed only if left unattached.

Avoid: NAT Gateway (~$32/mo), ALB (~$16/mo — Caddy on the same box does the
job), RDS, and unbounded CloudWatch retention.

## 8. Mobile builds

APKs come from **EAS Build**, not from this box:

```bash
npm install -g eas-cli
eas build --platform android --profile preview
```

That build URL doubles as the direct-download link for testers, which is the
competition distribution plan — Play closed testing cannot unlock in time.
