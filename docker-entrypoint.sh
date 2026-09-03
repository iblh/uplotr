#!/bin/sh
set -eu

if [ "${SKIP_DB_MIGRATIONS:-false}" != "true" ]; then
  ./node_modules/.bin/prisma migrate deploy
fi

exec node server.js
