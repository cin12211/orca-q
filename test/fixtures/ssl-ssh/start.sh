#!/usr/bin/env bash
# Bring up the SSL+SSH fixture: generate certs, then build & start containers.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project="${ORCAQ_SSLSSH_PROJECT:-orcaq-sslssh}"

resolve_compose() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    compose=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    compose=(docker-compose)
  else
    echo 'docker compose is not available.' >&2
    exit 1
  fi
}

bash "${script_dir}/gen-certs.sh"

resolve_compose
"${compose[@]}" -p "${project}" -f "${script_dir}/docker-compose.yml" up -d --build --remove-orphans
"${compose[@]}" -p "${project}" -f "${script_dir}/docker-compose.yml" ps

echo ""
echo "SSL+SSH fixture up. SSH bastion: localhost:2222 (user 'tunnel')."
echo "See test/fixtures/ssl-ssh/README.md for OrcaQ connection values."
