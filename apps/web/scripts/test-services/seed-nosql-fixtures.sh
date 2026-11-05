#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Seeding Redis fixture"
node "${script_dir}/seed-redis-fixture.mjs"

echo "Redis fixture has been reseeded"
