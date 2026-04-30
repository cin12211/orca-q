#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Preparing local SQLite sample"
bash "${script_dir}/prepare-sample-data.sh"

echo "Starting SQL fixtures"
bash "${script_dir}/start-sql-fixtures.sh"

echo "Starting Redis fixture"
bash "${script_dir}/start-nosql-fixtures.sh"

echo "All database fixtures are ready"
