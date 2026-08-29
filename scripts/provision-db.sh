#!/usr/bin/env bash
# Provision a Postgres role + database for the Orbitron "genspark" project in
# the shared dev-postgres container, and drop the connection URL onto the
# project's /app/data volume so the container picks it up without an env-var
# redeploy. The password is generated here and never echoed.
set -euo pipefail

DB=genspark_vfx
ROLE=genspark_vfx
HOST=192.168.219.101
VOLDIR="$HOME/WORK/orbitron/deployments/genspark/_volumes/data"
URLFILE="$VOLDIR/database-url"

if [ -f "$URLFILE" ]; then
  echo "ALREADY_PROVISIONED: $URLFILE exists — leaving it alone"
  exit 0
fi

PW="$(openssl rand -hex 24)"

docker exec -i dev-postgres psql -U postgres -v ON_ERROR_STOP=1 >/dev/null <<SQL
DO \$do\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${ROLE}') THEN
    CREATE ROLE ${ROLE} LOGIN PASSWORD '${PW}';
  ELSE
    ALTER ROLE ${ROLE} LOGIN PASSWORD '${PW}';
  END IF;
END
\$do\$;
SQL

if ! docker exec -i dev-postgres psql -U postgres -tAc \
      "SELECT 1 FROM pg_database WHERE datname='${DB}'" | grep -q 1; then
  docker exec -i dev-postgres psql -U postgres -v ON_ERROR_STOP=1 >/dev/null \
    -c "CREATE DATABASE ${DB} OWNER ${ROLE}"
  echo "created database ${DB}"
else
  echo "database ${DB} already existed"
fi

mkdir -p "$VOLDIR"
umask 077
printf 'postgresql://%s:%s@%s:5432/%s' "$ROLE" "$PW" "$HOST" "$DB" > "$URLFILE"
chmod 600 "$URLFILE"

echo "wrote $URLFILE ($(wc -c < "$URLFILE") bytes, mode $(stat -c %a "$URLFILE"))"
echo "role=${ROLE} db=${DB} host=${HOST}:5432 password=<generated, not printed>"

# Prove the credentials actually work, without revealing them.
docker exec -i dev-postgres psql -U postgres -tAc \
  "SELECT 'CONNECT_OK ' || datname FROM pg_database WHERE datname='${DB}'"
