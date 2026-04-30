#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
dataset_root="${repo_root}/test/fixtures/datasets"
sqlite_source_dir="${dataset_root}/sqlite"
sqlite_output_dir="${dataset_root}/.tmp/sqlite"
sqlite_output_file="${sqlite_output_dir}/sakila.sqlite"
sqlite_schema_file="${sqlite_source_dir}/sqlite-sakila-schema.sql"
sqlite_data_file="${sqlite_source_dir}/sqlite-sakila-insert-data.sql"

resolve_container_cmd() {
  if command -v podman >/dev/null 2>&1 && podman info >/dev/null 2>&1; then
    container_cmd=(podman)
    return 0
  fi

  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    container_cmd=(docker)
    return 0
  fi

  echo 'Neither podman nor docker is available.' >&2
  return 1
}

require_file() {
  local file_path="$1"

  if [ ! -f "${file_path}" ]; then
    echo "Required file not found: ${file_path}" >&2
    exit 1
  fi
}

build_sqlite_with_container() {
  mkdir -p "${sqlite_output_dir}"
  rm -f "${sqlite_output_file}"

  "${container_cmd[@]}" run --rm \
    -v "${repo_root}:/workspace/repo:rw" \
    -w /workspace/repo \
    python:3.12-alpine \
    python - <<'PY'
from pathlib import Path
import sqlite3

repo_root = Path('/workspace/repo')
schema_file = repo_root / 'test/fixtures/datasets/sqlite/sqlite-sakila-schema.sql'
data_file = repo_root / 'test/fixtures/datasets/sqlite/sqlite-sakila-insert-data.sql'
output_file = repo_root / 'test/fixtures/datasets/.tmp/sqlite/sakila.sqlite'

output_file.parent.mkdir(parents=True, exist_ok=True)
if output_file.exists():
    output_file.unlink()

connection = sqlite3.connect(output_file)
try:
    connection.executescript(schema_file.read_text(encoding='utf-8'))
    connection.executescript(data_file.read_text(encoding='utf-8'))
    connection.commit()
finally:
    connection.close()
PY
}

prepare_sqlite_sample() {
  require_file "${sqlite_schema_file}"
  require_file "${sqlite_data_file}"

  echo 'Preparing SQLite Sakila sample via containerized runtime'

  resolve_container_cmd
  build_sqlite_with_container
}

prepare_sqlite_sample

echo "SQLite sample is ready at ${sqlite_output_file}"
