#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
compose_file="${repo_root}/test/fixtures/containers/sql-services.compose.yml"
compose_project="${HERAQ_SQL_FIXTURE_PROJECT:-heraq-sql-fixtures}"
legacy_compose_project="${HERAQ_FIXTURE_LEGACY_PROJECT:-containers}"

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

cleanup_legacy_project() {
  if [ "${legacy_compose_project}" = "${compose_project}" ]; then
    return 0
  fi

  "${compose_cmd[@]}" -p "${legacy_compose_project}" -f "${compose_file}" down --volumes --remove-orphans >/dev/null 2>&1 || true
}

compose_cmd=()
wait_cmd=()

resolve_compose_cmd
cleanup_legacy_project

postgres_port="${HERAQ_POSTGRES_PORT:-5432}"
mysql_port="${HERAQ_MYSQL_PORT:-3306}"
mariadb_port="${HERAQ_MARIADB_PORT:-3307}"

echo "Starting SQL fixtures with: ${compose_cmd[*]}"
"${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" up -d --remove-orphans

if resolve_wait_cmd; then
  "${wait_cmd[@]}" \
    "tcp:127.0.0.1:${postgres_port}" \
    "tcp:127.0.0.1:${mysql_port}" \
    "tcp:127.0.0.1:${mariadb_port}"
else
  echo 'bunx/npx not found; skipping readiness wait.' >&2
fi

bash "${script_dir}/seed-sql-fixtures.sh"

"${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" ps

echo "SQL fixtures are ready on ports ${postgres_port}, ${mysql_port}, ${mariadb_port}"
