#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo 'Recreating SQL fixtures from container init scripts'
bash "${script_dir}/start-sql-fixtures.sh"
