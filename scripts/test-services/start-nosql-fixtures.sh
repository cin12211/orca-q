#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
compose_file="${repo_root}/test/fixtures/containers/nosql-services.compose.yml"

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

compose_cmd=()
wait_cmd=()

resolve_compose_cmd

redis_port="${HERAQ_REDIS_PORT:-6379}"

echo "Starting Redis fixture with: ${compose_cmd[*]}"
"${compose_cmd[@]}" -f "${compose_file}" up -d --remove-orphans

if resolve_wait_cmd; then
  "${wait_cmd[@]}" "tcp:127.0.0.1:${redis_port}"
else
  echo 'bunx/npx not found; skipping readiness wait.' >&2
fi

"${compose_cmd[@]}" -f "${compose_file}" ps

echo "Redis fixture is ready at redis://127.0.0.1:${redis_port}"