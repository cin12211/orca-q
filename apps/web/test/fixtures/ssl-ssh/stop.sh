#!/usr/bin/env bash
# Tear down the SSL+SSH fixture (add -v arg to also drop volumes).
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project="${ORCAQ_SSLSSH_PROJECT:-orcaq-sslssh}"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  compose=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  compose=(docker-compose)
else
  echo 'docker compose is not available.' >&2
  exit 1
fi

"${compose[@]}" -p "${project}" -f "${script_dir}/docker-compose.yml" down --remove-orphans "$@"
echo "SSL+SSH fixture stopped."
