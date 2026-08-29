#!/usr/bin/env bash
# Provision a Postgres role + database for the Orbitron "genspark" project in
# the shared dev-postgres container, then drop the connection URL onto the
# project's /app/data volume so the container picks it up without an env-var
# redeploy. The generated password is never echoed.
#
# Run on the Orbitron host (192.168.219.101). Safe to re-run: it does nothing
# if the connection file already exists.
set -euo pipefail

DB=genspark_vfx
ROLE=genspark_vfx
PGHOST_FOR_APP=192.168.219.101
CONTAINER=dev-postgres
VOLDIR="$HOME/WORK/orbitron/deployments/genspark/_volumes/data"
URLFILE="$VOLDIR/database-url"

if [ -f "$URLFILE" ]; then
  echo "ALREADY_PROVISIONED: $URLFILE exists — leaving it alone"
  exit 0
fi

# The bootstrap superuser is whatever POSTGRES_USER the container was created
# with — it is 'devuser' here, not 'postgres', so read it rather than assume.
SUPER=$(docker inspect "$CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' \
        | sed -n 's/^POSTGRES_USER=//p' | head -1)
SUPERDB=$(docker inspect "$CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' \
        | sed -n 's/^POSTGRES_DB=//p' | head -1)
SUPER=${SUPER:-postgres}
SUPERDB=${SUPERDB:-$SUPER}
echo "using superuser '${SUPER}' on database '${SUPERDB}' in ${CONTAINER}"

psql_super() { docker exec -i "$CONTAINER" psql -U "$SUPER" -d "$SUPERDB" "$@"; }

PW="$(openssl rand -hex 24)"

psql_super -v ON_ERROR_STOP=1 >/dev/null <<SQL
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
echo "role ${ROLE} ready"

if psql_super -tAc "SELECT 1 FROM pg_database WHERE datname='${DB}'" | grep -q 1; then
  echo "database ${DB} already existed"
else
  psql_super -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB} OWNER ${ROLE}" >/dev/null
  echo "created database ${DB}"
fi

mkdir -p "$VOLDIR"
umask 077
printf 'postgresql://%s:%s@%s:5432/%s' "$ROLE" "$PW" "$PGHOST_FOR_APP" "$DB" > "$URLFILE"
chmod 600 "$URLFILE"
echo "wrote $URLFILE (mode $(stat -c %a "$URLFILE"))"

# Prove the generated credentials actually authenticate, without printing them.
if docker exec -i -e PGPASSWORD="$PW" "$CONTAINER" \
     psql -U "$ROLE" -d "$DB" -h 127.0.0.1 -tAc "SELECT 'LOGIN_OK'" | grep -q LOGIN_OK; then
  echo "LOGIN_OK — ${ROLE}@${DB} authenticates"
else
  echo "WARNING: role/database created but the login test failed" >&2
  exit 1
fi

echo
echo "다음 단계: 컨테이너를 재시작하면 /app/data/database-url 을 읽어 기능이 켜집니다."
echo "  docker restart \$(docker ps --filter name=orbitron-genspark --format '{{.Names}}' | head -1)"
