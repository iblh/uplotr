# Upgrading

Public Beta releases may include database migrations. Read the release notes and take a backup first.

## Docker Compose

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

The application image runs `prisma migrate deploy` before starting the web server. Watch the app logs and confirm `/api/health` returns `healthy`.

## Vercel

Use an isolated preview database for preview deployments. Run `pnpm prisma migrate deploy` against production before promoting a production deployment. Do not run production migrations from untrusted pull-request builds.

## Rollback

Keep the previous application image or Vercel deployment available. Database migrations are designed to be additive during the Public Beta rollback window; do not remove legacy columns until the following stable deployment.
