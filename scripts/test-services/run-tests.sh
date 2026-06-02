#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# run-tests.sh — Unified test runner with automatic fixture provisioning
#
# Usage:
#   bash scripts/test-services/run-tests.sh --fixtures=<profile> [--] <command...>
#
# Profiles: none | postgres | mysql | mariadb | sql | redis | sqlite | all
#
# Examples:
#   bash scripts/test-services/run-tests.sh --fixtures=postgres -- playwright test --project postgres
#   bash scripts/test-services/run-tests.sh --fixtures=redis -- vitest --run --project integration
#   bash scripts/test-services/run-tests.sh --fixtures=all -- playwright test
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
fixture_profile="${ORCAQ_FIXTURE_PROFILE:-all}"

# ─── Parse arguments ──────────────────────────────────────────────────────────
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
  echo "Error: No test command specified." >&2
  echo "Usage: run-tests.sh --fixtures=<profile> -- <command...>" >&2
  exit 1
fi

# ─── Fixture management ──────────────────────────────────────────────────────
start_fixtures() {
  case "${fixture_profile}" in
    none)
      return 0
      ;;
    postgres|mysql|mariadb|sql)
      bash "${script_dir}/start-fixtures.sh" --profile "${fixture_profile}"
      ;;
    redis)
      bash "${script_dir}/start-fixtures.sh" --profile redis
      ;;
    sqlite)
      bash "${script_dir}/start-fixtures.sh" --profile sqlite
      ;;
    all)
      bash "${script_dir}/start-fixtures.sh" --profile all
      ;;
    *)
      echo "Unknown fixture profile: ${fixture_profile}" >&2
      return 1
      ;;
  esac
}

stop_fixtures() {
  case "${fixture_profile}" in
    none|sqlite)
      return 0
      ;;
    postgres|mysql|mariadb|sql)
      bash "${script_dir}/stop-fixtures.sh" --profile "${fixture_profile}" || true
      ;;
    redis)
      bash "${script_dir}/stop-fixtures.sh" --profile redis || true
      ;;
    all)
      bash "${script_dir}/stop-fixtures.sh" --profile all || true
      ;;
    *)
      return 0
      ;;
  esac
}

cleanup() {
  local exit_code="$1"

  if [ "${ORCAQ_KEEP_FIXTURES:-0}" = "1" ]; then
    return 0
  fi

  if [ "${fixture_profile}" != "none" ]; then
    echo "Stopping fixtures (${fixture_profile})"
    stop_fixtures >/dev/null 2>&1 || true
  fi
  return "${exit_code}"
}

trap 'cleanup "$?"' EXIT

# ─── Run ─────────────────────────────────────────────────────────────────────
cd "${repo_root}"

# Ensure node_modules binaries (playwright, vitest, etc.) are resolvable
# even when this script is invoked directly via bash rather than via bun run.
export PATH="${repo_root}/node_modules/.bin:${PATH}"

if [ "${fixture_profile}" != "none" ]; then
  echo "Bootstrapping fixtures (profile: ${fixture_profile})"
  start_fixtures
fi

echo "Running: $*"
"$@"
