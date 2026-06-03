#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
compose_file="${repo_root}/test/fixtures/containers/sql-services.compose.yml"
compose_project="${ORCAQ_SQL_FIXTURE_PROJECT:-orcaq-sql-fixtures}"

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
    wait_cmd=(bunx wait-on)
    return 0
  fi

  if command -v npx >/dev/null 2>&1; then
    wait_cmd=(npx wait-on)
    return 0
  fi

  return 1
}

reset_current_project() {
  "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" --profile all down --volumes --remove-orphans >/dev/null 2>&1 || true
}

wait_for_postgres_fixture() {
  local db_name="${ORCAQ_POSTGRES_DATABASE:-pagila}"
  local db_user="${ORCAQ_POSTGRES_USER:-orcaq}"
  local db_password="${ORCAQ_POSTGRES_PASSWORD:-orcaq}"
  local attempt=0

  until "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" exec -T postgres \
    env PGPASSWORD="${db_password}" \
    psql -h 127.0.0.1 -U "${db_user}" -d "${db_name}" -tAc 'SELECT COUNT(*) FROM actor;' >/dev/null 2>&1; do
    attempt=$((attempt + 1))

    if [ "${attempt}" -ge 60 ]; then
      echo 'PostgreSQL fixture schema/data did not become ready in time.' >&2
      exit 1
    fi

    sleep 2
  done
}

wait_for_mysql_fixture() {
  local service_name="$1"
  local host_port="$2"
  local db_user="$3"
  local db_password="$4"
  local database_name="$5"
  local engine_label="$6"
  local attempt=0

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
})().catch(() => {
  process.exit(1);
});
NODE
  ) >/dev/null 2>&1; do
    attempt=$((attempt + 1))

    if [ "${attempt}" -ge 180 ]; then
      echo "${engine_label} fixture schema/data did not become ready on host port ${host_port} in time." >&2
      "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" logs --tail=80 "${service_name}" >&2 || true
      exit 1
    fi

    sleep 2
  done
}

compose_cmd=()
wait_cmd=()

resolve_compose_cmd
reset_current_project

postgres_port="${ORCAQ_POSTGRES_PORT:-5432}"
mysql_port="${ORCAQ_MYSQL_PORT:-3306}"
mariadb_port="${ORCAQ_MARIADB_PORT:-3307}"

echo "Starting SQL fixtures with: ${compose_cmd[*]}"
"${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" --profile all up -d --remove-orphans

if resolve_wait_cmd; then
  "${wait_cmd[@]}" \
    "tcp:127.0.0.1:${postgres_port}" \
    "tcp:127.0.0.1:${mysql_port}" \
    "tcp:127.0.0.1:${mariadb_port}"
else
  echo 'bunx/npx not found; skipping readiness wait.' >&2
fi

wait_for_postgres_fixture
wait_for_mysql_fixture \
  mysql \
  "${mysql_port}" \
  "${ORCAQ_MYSQL_USER:-orcaq}" \
  "${ORCAQ_MYSQL_PASSWORD:-orcaq}" \
  "${ORCAQ_MYSQL_DATABASE:-sakila}" \
  'MySQL'
wait_for_mysql_fixture \
  mariadb \
  "${mariadb_port}" \
  "${ORCAQ_MARIADB_USER:-orcaq}" \
  "${ORCAQ_MARIADB_PASSWORD:-orcaq}" \
  "${ORCAQ_MARIADB_DATABASE:-sakila}" \
  'MariaDB'

"${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" ps

echo "SQL fixtures are ready on ports ${postgres_port}, ${mysql_port}, ${mariadb_port}"
