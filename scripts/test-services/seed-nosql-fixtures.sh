#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
compose_file="${repo_root}/test/fixtures/containers/nosql-services.compose.yml"
compose_project="${ORCAQ_REDIS_FIXTURE_PROJECT:-${HERAQ_REDIS_FIXTURE_PROJECT:-heraq-redis-fixture}}"

resolve_compose_cmd() {
  if command -v podman >/dev/null 2>&1 && podman info >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
    compose_cmd=(podman compose)
    return 0
  fi

  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
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

echo "Seeding Redis fixture"
node "${script_dir}/seed-redis-fixture.mjs"

echo "Redis fixture has been reseeded"
