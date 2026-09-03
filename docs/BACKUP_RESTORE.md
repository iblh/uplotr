# Backup and restore

Location history is operational data. Back it up before upgrades and test restores regularly.

## Docker Compose backup

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U uplotr_user -d uplotr_db -Fc > uplotr-backup.dump
```

Store the resulting file outside the server and protect it as sensitive location data.

## Restore

Stop application writes, create an empty PostgreSQL database, then restore:

```bash
pg_restore --clean --if-exists --no-owner \
  --dbname "$DATABASE_URL" uplotr-backup.dump
```

Run `pnpm prisma migrate deploy` after restoration and verify `/api/health`, login, devices, and recent trajectories.

For managed PostgreSQL, also enable provider snapshots or point-in-time recovery where available.
