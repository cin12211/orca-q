#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Stopping Redis fixture"
bash "${script_dir}/stop-nosql-fixtures.sh"

echo "Stopping SQL fixtures"
bash "${script_dir}/stop-sql-fixtures.sh"

echo "All database fixtures have been stopped"
