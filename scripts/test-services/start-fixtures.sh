#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# start-fixtures.sh — Start database fixtures by profile
#
# Usage:
#   bash scripts/test-services/start-fixtures.sh --profile <profile>
#
# Profiles: postgres | mysql | mariadb | sql | redis | sqlite | all
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
profile="${ORCAQ_FIXTURE_PROFILE:-all}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --profile=*) profile="${1#*=}"; shift ;;
    --profile) profile="${2:-}"; shift 2 ;;
    *) shift ;;
  esac
done

# ─── Env defaults ────────────────────────────────────────────────────────────
export ORCAQ_POSTGRES_PORT="${ORCAQ_POSTGRES_PORT:-5432}"
export ORCAQ_POSTGRES_DATABASE="${ORCAQ_POSTGRES_DATABASE:-pagila}"
export ORCAQ_POSTGRES_USER="${ORCAQ_POSTGRES_USER:-orcaq}"
export ORCAQ_POSTGRES_PASSWORD="${ORCAQ_POSTGRES_PASSWORD:-orcaq}"
export ORCAQ_MYSQL_PORT="${ORCAQ_MYSQL_PORT:-3306}"
export ORCAQ_MYSQL_DATABASE="${ORCAQ_MYSQL_DATABASE:-sakila}"
export ORCAQ_MYSQL_USER="${ORCAQ_MYSQL_USER:-orcaq}"
export ORCAQ_MYSQL_PASSWORD="${ORCAQ_MYSQL_PASSWORD:-orcaq}"
export ORCAQ_MYSQL_ROOT_PASSWORD="${ORCAQ_MYSQL_ROOT_PASSWORD:-root}"
export ORCAQ_MARIADB_PORT="${ORCAQ_MARIADB_PORT:-3307}"
export ORCAQ_MARIADB_DATABASE="${ORCAQ_MARIADB_DATABASE:-sakila}"
export ORCAQ_MARIADB_USER="${ORCAQ_MARIADB_USER:-orcaq}"
export ORCAQ_MARIADB_PASSWORD="${ORCAQ_MARIADB_PASSWORD:-orcaq}"
export ORCAQ_MARIADB_ROOT_PASSWORD="${ORCAQ_MARIADB_ROOT_PASSWORD:-root}"
export ORCAQ_REDIS_PORT="${ORCAQ_REDIS_PORT:-6379}"

# ─── Docker compose resolution ───────────────────────────────────────────────
sql_compose_file="${repo_root}/test/fixtures/containers/sql-services.compose.yml"
redis_compose_file="${repo_root}/test/fixtures/containers/nosql-services.compose.yml"
sql_project="${ORCAQ_SQL_FIXTURE_PROJECT:-orcaq-sql-fixtures}"
redis_project="${ORCAQ_REDIS_FIXTURE_PROJECT:-orcaq-redis-fixture}"

compose_cmd=()

resolve_compose_cmd() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    compose_cmd=(docker compose)
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    compose_cmd=(docker-compose)
    return 0
  fi
  echo 'docker compose is not available.' >&2
  return 1
}

resolve_wait_cmd() {
  if command -v bunx >/dev/null 2>&1; then
    echo "bunx wait-on"
    return 0
  fi
  if command -v npx >/dev/null 2>&1; then
    echo "npx wait-on"
    return 0
  fi
  return 1
}

# ─── Readiness checks ────────────────────────────────────────────────────────
wait_for_postgres() {
  local attempt=0
  echo "Waiting for PostgreSQL..."
  until "${compose_cmd[@]}" -p "${sql_project}" -f "${sql_compose_file}" exec -T postgres \
    env PGPASSWORD="${ORCAQ_POSTGRES_PASSWORD}" \
    psql -h 127.0.0.1 -U "${ORCAQ_POSTGRES_USER}" -d "${ORCAQ_POSTGRES_DATABASE}" -tAc 'SELECT COUNT(*) FROM actor;' >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "${attempt}" -ge 60 ]; then
      echo 'PostgreSQL fixture did not become ready in time.' >&2
      exit 1
    fi
    sleep 2
  done
  echo "PostgreSQL is ready on port ${ORCAQ_POSTGRES_PORT}"
}

wait_for_mysql_engine() {
  local service_name="$1"
  local host_port="$2"
  local db_user="$3"
  local db_password="$4"
  local database_name="$5"
  local engine_label="$6"
  local attempt=0

  echo "Waiting for ${engine_label}..."
  until (
    cd "${repo_root}" &&
      FIXTURE_HOST=127.0.0.1 \
      FIXTURE_PORT="${host_port}" \
      FIXTURE_USER="${db_user}" \
      FIXTURE_PASSWORD="${db_password}" \
      FIXTURE_DATABASE="${database_name}" \
      node <<'NODE'
const mysql = require('mysql2/promise');
(async () => {
  const connection = await mysql.createConnection({
    host: process.env.FIXTURE_HOST,
    port: Number(process.env.FIXTURE_PORT),
    user: process.env.FIXTURE_USER,
    password: process.env.FIXTURE_PASSWORD,
    database: process.env.FIXTURE_DATABASE,
  });
  try {
    await connection.query('SELECT COUNT(*) FROM actor;');
  } finally {
    await connection.end();
  }
})().catch(() => { process.exit(1); });
NODE
  ) >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "${attempt}" -ge 180 ]; then
      echo "${engine_label} fixture did not become ready on port ${host_port} in time." >&2
      "${compose_cmd[@]}" -p "${sql_project}" -f "${sql_compose_file}" logs --tail=80 "${service_name}" >&2 || true
      exit 1
    fi
    sleep 2
  done
  echo "${engine_label} is ready on port ${host_port}"
}

# ─── Start functions ─────────────────────────────────────────────────────────
start_sql_profile() {
  local docker_profile="$1"
  echo "Starting SQL fixtures (docker profile: ${docker_profile})"

  # Clean up any existing containers
  "${compose_cmd[@]}" -p "${sql_project}" -f "${sql_compose_file}" --profile "${docker_profile}" down --volumes --remove-orphans >/dev/null 2>&1 || true

  # Start containers
  "${compose_cmd[@]}" -p "${sql_project}" -f "${sql_compose_file}" --profile "${docker_profile}" up -d --remove-orphans

  # Wait for readiness based on profile
  case "${docker_profile}" in
    postgres)
      wait_for_postgres
      ;;
    mysql)
      wait_for_mysql_engine mysql "${ORCAQ_MYSQL_PORT}" "${ORCAQ_MYSQL_USER}" "${ORCAQ_MYSQL_PASSWORD}" "${ORCAQ_MYSQL_DATABASE}" 'MySQL'
      ;;
    mariadb)
      wait_for_mysql_engine mariadb "${ORCAQ_MARIADB_PORT}" "${ORCAQ_MARIADB_USER}" "${ORCAQ_MARIADB_PASSWORD}" "${ORCAQ_MARIADB_DATABASE}" 'MariaDB'
      ;;
    sql|all)
      wait_for_postgres
      wait_for_mysql_engine mysql "${ORCAQ_MYSQL_PORT}" "${ORCAQ_MYSQL_USER}" "${ORCAQ_MYSQL_PASSWORD}" "${ORCAQ_MYSQL_DATABASE}" 'MySQL'
      wait_for_mysql_engine mariadb "${ORCAQ_MARIADB_PORT}" "${ORCAQ_MARIADB_USER}" "${ORCAQ_MARIADB_PASSWORD}" "${ORCAQ_MARIADB_DATABASE}" 'MariaDB'
      ;;
  esac

  "${compose_cmd[@]}" -p "${sql_project}" -f "${sql_compose_file}" --profile "${docker_profile}" ps
}

start_redis() {
  echo "Starting Redis fixture"

  "${compose_cmd[@]}" -p "${redis_project}" -f "${redis_compose_file}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  "${compose_cmd[@]}" -p "${redis_project}" -f "${redis_compose_file}" up -d --remove-orphans

  local wait_cmd
  if wait_cmd=$(resolve_wait_cmd); then
    ${wait_cmd} "tcp:127.0.0.1:${ORCAQ_REDIS_PORT}"
  else
    sleep 3
  fi

  bash "${script_dir}/seed-nosql-fixtures.sh"
  echo "Redis is ready on port ${ORCAQ_REDIS_PORT}"
}

start_sqlite() {
  echo "Preparing SQLite fixture"
  bash "${script_dir}/prepare-sample-data.sh"
  echo "SQLite fixture is ready"
}

# ─── Main ────────────────────────────────────────────────────────────────────
resolve_compose_cmd

case "${profile}" in
  none)
    echo "No fixtures requested"
    ;;
  postgres|mysql|mariadb)
    node "${script_dir}/generate-optimized-sql-fixtures.mjs" 2>/dev/null || true
    start_sql_profile "${profile}"
    ;;
  sql)
    node "${script_dir}/generate-optimized-sql-fixtures.mjs" 2>/dev/null || true
    start_sql_profile "sql"
    ;;
  redis)
    start_redis
    ;;
  sqlite)
    node "${script_dir}/generate-optimized-sql-fixtures.mjs" 2>/dev/null || true
    start_sqlite
    ;;
  all)
    node "${script_dir}/generate-optimized-sql-fixtures.mjs" 2>/dev/null || true
    start_sqlite
    start_sql_profile "all"
    start_redis
    echo "All fixtures are ready"
    ;;
  *)
    echo "Unknown profile: ${profile}" >&2
    exit 1
    ;;
esac
