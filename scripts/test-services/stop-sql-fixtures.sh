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

compose_cmd=()

resolve_compose_cmd

echo "Stopping SQL fixtures with: ${compose_cmd[*]}"
"${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" down --volumes --remove-orphans

if [ "${legacy_compose_project}" != "${compose_project}" ]; then
  "${compose_cmd[@]}" -p "${legacy_compose_project}" -f "${compose_file}" down --volumes --remove-orphans >/dev/null 2>&1 || true
fi