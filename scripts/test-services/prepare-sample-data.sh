#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"
dataset_root="${repo_root}/test/fixtures/datasets"
download_root="${dataset_root}/downloads"
sqlite_output_dir="${download_root}/sqlite"
sqlite_output_file="${sqlite_output_dir}/chinook.sqlite"
sqlite_source_file="${repo_root}/data/Chinook_Sqlite.sql"

build_sqlite_with_cli() {
  mkdir -p "${sqlite_output_dir}"
  rm -f "${sqlite_output_file}"
  sqlite3 "${sqlite_output_file}" < "${sqlite_source_file}"
}

build_sqlite_with_node() {
  mkdir -p "${sqlite_output_dir}"
  rm -f "${sqlite_output_file}"

  REPO_ROOT="${repo_root}" SQLITE_OUTPUT_FILE="${sqlite_output_file}" SQLITE_SOURCE_FILE="${sqlite_source_file}" node <<'NODE'
const fs = require('node:fs');
const Database = require('better-sqlite3');

const outputFile = process.env.SQLITE_OUTPUT_FILE;
const sourceFile = process.env.SQLITE_SOURCE_FILE;

if (!outputFile || !sourceFile) {
  throw new Error('Missing SQLite preparation environment variables.');
}

const sql = fs.readFileSync(sourceFile, 'utf8');
const db = new Database(outputFile);

try {
  db.exec(sql);
} finally {
  db.close();
}
NODE
}

prepare_sqlite_sample() {
  if [ ! -f "${sqlite_source_file}" ]; then
    echo "SQLite sample source not found: ${sqlite_source_file}" >&2
    exit 1
  fi

  echo "Preparing SQLite Chinook sample"

  if command -v sqlite3 >/dev/null 2>&1; then
    build_sqlite_with_cli
    return 0
  fi

  build_sqlite_with_node
}

prepare_sqlite_sample

echo "SQLite sample is ready at ${sqlite_output_file}"
