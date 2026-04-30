#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
fixture_profile="${ORCAQ_FIXTURE_PROFILE:-${HERAQ_FIXTURE_PROFILE:-all}}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --fixtures=*)
      fixture_profile="${1#*=}"
      shift
      ;;
    --fixtures)
      fixture_profile="${2:-}"
      shift 2
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

if [ "$#" -eq 0 ]; then
  set -- test:db-matrix:playwright:raw
fi

run_fixture_script() {
  case "${fixture_profile}" in
    none)
      return 0
      ;;
    redis)
      npm run "test:fixtures:redis:$1"
      ;;
    sql)
      npm run "test:fixtures:sql:$1"
      ;;
    all)
      npm run "test:fixtures:all:$1"
      ;;
    *)
      echo "Unknown fixture profile: ${fixture_profile}" >&2
      return 1
      ;;
  esac
}

cleanup() {
  local exit_code="$1"

  if [ "${ORCAQ_KEEP_FIXTURES:-${HERAQ_KEEP_FIXTURES:-0}}" = "1" ]; then
    return 0
  fi

  if [ "${fixture_profile}" != "none" ]; then
    echo "Stopping fixtures (${fixture_profile})"
    run_fixture_script stop >/dev/null 2>&1 || true
  fi
  return "${exit_code}"
}

trap 'cleanup "$?"' EXIT

cd "${repo_root}"

if [ "${fixture_profile}" != "none" ]; then
  echo "Bootstrapping local fixtures (${fixture_profile})"
  run_fixture_script start
fi

for script_name in "$@"; do
  echo "Running npm run ${script_name}"
  npm run "${script_name}"
done
