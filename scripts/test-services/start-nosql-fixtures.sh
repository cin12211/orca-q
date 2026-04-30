#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
compose_file="${repo_root}/test/fixtures/containers/nosql-services.compose.yml"
compose_project="${HERAQ_REDIS_FIXTURE_PROJECT:-heraq-redis-fixture}"
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

redis_port="${HERAQ_REDIS_PORT:-6379}"

echo "Starting Redis fixture with: ${compose_cmd[*]}"
"${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" up -d --remove-orphans

if resolve_wait_cmd; then
  "${wait_cmd[@]}" "tcp:127.0.0.1:${redis_port}"
else
  echo 'bunx/npx not found; skipping readiness wait.' >&2
fi

bash "${script_dir}/seed-nosql-fixtures.sh"

"${compose_cmd[@]}" -p "${compose_project}" -f "${compose_file}" ps

echo "Redis fixture is ready at redis://127.0.0.1:${redis_port}"