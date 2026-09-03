# Deployment

uplotr is a Next.js application backed by PostgreSQL. Docker Compose is the primary self-hosting path; Vercel remains a supported managed application host.

## Production requirements

- Node.js 22 when running outside the container
- PostgreSQL 14 or newer
- HTTPS on any internet-facing deployment
- `AUTH_SECRET` and `CRON_SECRET`: different, randomly generated values of at least 32 characters
- `AUTH_MODE=REQUIRED`
- A tested database backup and restore process

MapLibre + OpenFreeMap is the default and needs no map token. `MAP_PROVIDER=MAPBOX` additionally requires `MAPBOX_TOKEN`.

## Docker Compose

```bash
git clone https://github.com/iblh/uplotr.git
cd uplotr
cp .env.prod.example .env
```

Edit `.env` and replace `AUTH_SECRET`, `CRON_SECRET`, and `DB_PASSWORD`. The example `DATABASE_URL` is for local development and is overridden by the production Compose file.

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

The image runs `prisma migrate deploy` before starting the non-root Next.js standalone server. The app becomes healthy only after `/api/health` can reach PostgreSQL. Open `http://localhost:3000/login` to create the first owner.

To use a pinned Beta image, change the Compose image to `ghcr.io/iblh/uplotr:0.2.0-beta.1`. `latest` points to the newest published Beta.

### Upgrade

Back up first, then:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Keep the previous image tag available until login, ingest, maps, and recent history are verified.

## Vercel

1. Import the GitHub repository into Vercel.
2. Add a PostgreSQL provider through the Vercel Marketplace, such as Neon or Supabase. New “Vercel Postgres” databases are no longer provisioned directly.
3. Place the database near the Vercel Functions region and use the provider's pooled application connection string for `DATABASE_URL`.
4. Set `AUTH_SECRET`, `CRON_SECRET`, `AUTH_MODE=REQUIRED`, and optionally the map variables in every intended environment.
5. Use a separate preview database. Never point untrusted pull-request previews at production.
6. Apply `pnpm exec prisma migrate deploy` to the target database before promoting the deployment.

`vercel.json` schedules `GET /api/maintenance/cleanup`. Vercel supplies `Authorization: Bearer $CRON_SECRET`; the route rejects the request if the secret is missing or incorrect. Administrators may also trigger the same cleanup with an authenticated same-origin `POST`.

For the public split deployment, attach `uplotr.com` and `app.uplotr.com` to the project. Requests to `app.uplotr.com/` are routed to `/app`; `uplotr.com/` remains the public site.

## Reverse proxy and standalone Node

The build emits `.next/standalone`. If you operate it without Docker, run migrations first and launch `node .next/standalone/server.js` behind an HTTPS reverse proxy. Forward the original host and client IP headers, and limit request bodies at the proxy as an additional defense.

## Operations

- Monitor `/api/health` for application version and database availability.
- Back up and restore according to [Backup and restore](BACKUP_RESTORE.md).
- Treat logs, database snapshots, and location history as sensitive data.
- Rotate session, Cron, static ingest, and database secrets independently.
- Review retention settings and remove expired rate-limit buckets through the cleanup task.
