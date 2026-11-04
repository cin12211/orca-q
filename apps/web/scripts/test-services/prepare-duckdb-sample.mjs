#!/usr/bin/env node
// Builds the DuckDB sample databases into test/fixtures/datasets/.tmp/duckdb.
// DuckDB is embedded, so unlike the other fixtures nothing keeps running.
import { DuckDBInstance } from '@duckdb/node-api';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sqlDir = join(repoRoot, 'test/fixtures/datasets/duckdb');

export const DEFAULT_OUTPUT_DIR = join(
  repoRoot,
  'test/fixtures/datasets/.tmp/duckdb'
);

function readSql(fileName) {
  return readFileSync(join(sqlDir, fileName), 'utf8');
}

async function buildDatabase(filePath, sqlFiles) {
  rmSync(filePath, { force: true });
  rmSync(`${filePath}.wal`, { force: true });

  const instance = await DuckDBInstance.create(filePath);
  const connection = await instance.connect();

  try {
    for (const sqlFile of sqlFiles) {
      await connection.run(readSql(sqlFile));
    }

    // Folds the WAL into the file so the result is one self-contained file.
    await connection.run('CHECKPOINT');
  } finally {
    connection.closeSync();
    instance.closeSync();
  }
}

export async function buildDuckDbSamples(outputDir = DEFAULT_OUTPUT_DIR) {
  mkdirSync(outputDir, { recursive: true });

  const shop = join(outputDir, 'shop.duckdb');
  const staging = join(outputDir, 'shop-staging.duckdb');

  await buildDatabase(shop, ['shop-schema.sql', 'shop-data.sql']);
  await buildDatabase(staging, ['shop-schema.sql', 'shop-staging-drift.sql']);

  return { shop, staging };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { shop, staging } = await buildDuckDbSamples();

  console.log(`DuckDB sample is ready at ${shop}`);
  console.log(`DuckDB staging sample is ready at ${staging}`);
}
