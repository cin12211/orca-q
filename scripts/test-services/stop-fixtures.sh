#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# stop-fixtures.sh — Stop database fixtures by profile
#
# Usage:
#   bash scripts/test-services/stop-fixtures.sh --profile <profile>
#
# Profiles: postgres | mysql | mariadb | sql | redis | all
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

stop_sql() {
  local docker_profile="${1:-all}"
  echo "Stopping SQL fixtures (profile: ${docker_profile})"
  "${compose_cmd[@]}" -p "${sql_project}" -f "${sql_compose_file}" --profile "${docker_profile}" down --volumes --remove-orphans
}

stop_redis() {
  echo "Stopping Redis fixture"
  "${compose_cmd[@]}" -p "${redis_project}" -f "${redis_compose_file}" down --volumes --remove-orphans
}

# ─── Main ────────────────────────────────────────────────────────────────────
resolve_compose_cmd

case "${profile}" in
  none|sqlite)
    echo "No containers to stop"
    ;;
  postgres|mysql|mariadb|sql)
    stop_sql "${profile}"
    ;;
  redis)
    stop_redis
    ;;
  all)
    stop_redis 2>/dev/null || true
    stop_sql "all" 2>/dev/null || true
    echo "All fixtures stopped"
    ;;
  *)
    echo "Unknown profile: ${profile}" >&2
    exit 1
    ;;
esac
