#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
compose_file="${repo_root}/test/fixtures/containers/sql-services.compose.yml"
dataset_root="${repo_root}/test/fixtures/datasets/downloads"
compose_project="${HERAQ_SQL_FIXTURE_PROJECT:-heraq-sql-fixtures}"

resolve_compose_cmd() {
  if command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
    compose_cmd=(podman compose)
    return 0
  fi

  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    compose_cmd=(docker compose)
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    compose_cmd=(docker-compose)
    return 0
  fi

  echo 'Neither podman compose nor docker compose is available.' >&2
  return 1
}

wait_for_postgres() {
  local db_user="$1"
  local db_password="$2"
  local attempt=0

  until "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" exec -T postgres \
    env PGPASSWORD="${db_password}" \
    pg_isready -h 127.0.0.1 -U "${db_user}" -d postgres >/dev/null 2>&1; do
    attempt=$((attempt + 1))

    if [ "${attempt}" -ge 30 ]; then
      echo 'PostgreSQL fixture did not become ready in time.' >&2
      exit 1
    fi

    sleep 2
  done
}

wait_for_mysql_variant() {
  local service_name="$1"
  local root_password="$2"
  local engine_label="$3"
  local ping_binary="$4"
  local attempt=0

  until "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" exec -T "${service_name}" \
    sh -lc "${ping_binary} -h 127.0.0.1 -uroot -p\"${root_password}\" ping --silent" >/dev/null 2>&1; do
    attempt=$((attempt + 1))

    if [ "${attempt}" -ge 30 ]; then
      echo "${engine_label} fixture did not become ready in time." >&2
      exit 1
    fi

    sleep 2
  done
}

require_file() {
  local file_path="$1"

  if [ ! -f "${file_path}" ]; then
    echo "Required file not found: ${file_path}" >&2
    exit 1
  fi
}

seed_postgres() {
  local schema_file="${dataset_root}/postgres/pagila-schema.sql"
  local data_file="${dataset_root}/postgres/pagila-data.sql"
  local db_name="${HERAQ_POSTGRES_DATABASE:-pagila}"
  local db_user="${HERAQ_POSTGRES_USER:-heraq}"
  local db_password="${HERAQ_POSTGRES_PASSWORD:-heraq}"

  require_file "${schema_file}"
  require_file "${data_file}"
  wait_for_postgres "${db_user}" "${db_password}"

  echo "Seeding PostgreSQL fixture with Pagila"
  "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" exec -T postgres \
    env PGPASSWORD="${db_password}" \
    psql -h 127.0.0.1 -U "${db_user}" -d postgres -v ON_ERROR_STOP=1 \
    -c "DO \$do\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN CREATE ROLE postgres LOGIN SUPERUSER; END IF; END \$do\$;"
  "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" exec -T postgres \
    env PGPASSWORD="${db_password}" \
    psql -h 127.0.0.1 -U "${db_user}" -d postgres -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS \"${db_name}\" WITH (FORCE);"
  "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" exec -T postgres \
    env PGPASSWORD="${db_password}" \
    psql -h 127.0.0.1 -U "${db_user}" -d postgres -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE \"${db_name}\" OWNER \"${db_user}\";"
  cat "${schema_file}" | "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" exec -T postgres \
    env PGPASSWORD="${db_password}" \
    psql -h 127.0.0.1 -U "${db_user}" -d "${db_name}" -v ON_ERROR_STOP=1
  cat "${data_file}" | "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" exec -T postgres \
    env PGPASSWORD="${db_password}" \
    psql -h 127.0.0.1 -U "${db_user}" -d "${db_name}" -v ON_ERROR_STOP=1
  "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" exec -T postgres \
    env PGPASSWORD="${db_password}" \
    psql -h 127.0.0.1 -U "${db_user}" -d "${db_name}" -v ON_ERROR_STOP=1 \
    -c "GRANT ALL PRIVILEGES ON SCHEMA public TO \"${db_user}\"; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"${db_user}\"; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"${db_user}\"; GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO \"${db_user}\";"
}

seed_mysql_variant() {
  local service_name="$1"
  local root_password="$2"
  local database_name="$3"
  local app_user="$4"
  local engine_label="$5"
  local ping_binary="$6"
  local sql_binary="$7"
  local schema_file="${dataset_root}/mysql/sakila-schema.sql"
  local data_file="${dataset_root}/mysql/sakila-data.sql"

  require_file "${schema_file}"
  require_file "${data_file}"
  wait_for_mysql_variant "${service_name}" "${root_password}" "${engine_label}" "${ping_binary}"

  echo "Seeding ${engine_label} fixture with Sakila"
  "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" exec -T "${service_name}" \
    sh -lc "${sql_binary} -uroot -p\"${root_password}\" -e \"DROP DATABASE IF EXISTS ${database_name};\""
  cat "${schema_file}" | "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" exec -T "${service_name}" \
    sh -lc "${sql_binary} -uroot -p\"${root_password}\""
  cat "${data_file}" | "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" exec -T "${service_name}" \
    sh -lc "${sql_binary} -uroot -p\"${root_password}\""
  "${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" exec -T "${service_name}" \
    sh -lc "${sql_binary} -uroot -p\"${root_password}\" -e \"GRANT ALL PRIVILEGES ON ${database_name}.* TO '${app_user}'@'%'; FLUSH PRIVILEGES;\""
}

compose_cmd=()

resolve_compose_cmd

seed_postgres
seed_mysql_variant \
  mysql \
  "${HERAQ_MYSQL_ROOT_PASSWORD:-root}" \
  "${HERAQ_MYSQL_DATABASE:-sakila}" \
  "${HERAQ_MYSQL_USER:-heraq}" \
  "MySQL" \
  mysqladmin \
  mysql
seed_mysql_variant \
  mariadb \
  "${HERAQ_MARIADB_ROOT_PASSWORD:-root}" \
  "${HERAQ_MARIADB_DATABASE:-sakila}" \
  "${HERAQ_MARIADB_USER:-heraq}" \
  "MariaDB" \
  mariadb-admin \
  mariadb

echo "SQL fixtures have been reseeded"
