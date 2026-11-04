#!/usr/bin/env bash
# DEPRECATED: Use run-tests.sh instead. This script is kept for backward compatibility.

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
fixture_profile="${ORCAQ_FIXTURE_PROFILE:-all}"

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
  set -- test:e2e:raw
fi

# Delegate to run-tests.sh
exec bash "${script_dir}/run-tests.sh" --fixtures="${fixture_profile}" -- npm run "$@"
