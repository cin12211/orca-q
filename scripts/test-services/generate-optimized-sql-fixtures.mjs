#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

const datasetConfigs = [
  {
    engine: 'postgres',
    sourcePath: resolve(
      repoRoot,
      'test/fixtures/datasets/postgres/postgres-sakila-insert-data-optimized.sql'
    ),
    outputPath: resolve(
      repoRoot,
      'test/fixtures/datasets/postgres/postgres-sakila-insert-data-optimized.sql'
    ),
    mode: 'prebuilt',
  },
  {
    engine: 'mysql',
    sourcePath: resolve(
      repoRoot,
      'test/fixtures/datasets/mysql/mysql-sakila-insert-data.sql'
    ),
    outputPath: resolve(
      repoRoot,
      'test/fixtures/datasets/mysql/mysql-sakila-insert-data-optimized.sql'
    ),
    mode: 'values-list',
    maxRowsPerInsert: 500,
  },
  {
    engine: 'oracle',
    sourcePath: resolve(
      repoRoot,
      'test/fixtures/datasets/oracle/oracle-sakila-insert-data.sql'
    ),
    outputPath: resolve(
      repoRoot,
      'test/fixtures/datasets/oracle/oracle-sakila-insert-data-optimized.sql'
    ),
    mode: 'oracle-insert-all',
    maxRowsPerInsert: 200,
  },
  {
    engine: 'sql-server',
    sourcePath: resolve(
      repoRoot,
      'test/fixtures/datasets/sql-server/sql-server-sakila-insert-data.sql'
    ),
    outputPath: resolve(
      repoRoot,
      'test/fixtures/datasets/sql-server/sql-server-sakila-insert-data-optimized.sql'
    ),
    mode: 'values-list',
    maxRowsPerInsert: 500,
  },
  {
    engine: 'sqlite',
    sourcePath: resolve(
      repoRoot,
      'test/fixtures/datasets/sqlite/sqlite-sakila-insert-data.sql'
    ),
    outputPath: resolve(
      repoRoot,
      'test/fixtures/datasets/sqlite/sqlite-sakila-insert-data-optimized.sql'
    ),
    mode: 'values-list',
    maxRowsPerInsert: 500,
  },
];

function isInsertLine(line) {
  return /^Insert into\b/i.test(line.trim());
}

function flushValuesListBatch(batch, outputLines) {
  if (!batch) {
    return null;
  }

  outputLines.push(batch.insertLine);
  outputLines.push(batch.columnsLine);
  outputLines.push(batch.valuesKeyword);

  batch.valueLines.forEach((valueLine, index) => {
    const suffix = index === batch.valueLines.length - 1 ? ';' : ',';
    outputLines.push(`${valueLine}${suffix}`);
  });

  return null;
}

function flushOracleInsertAllBatch(batch, outputLines) {
  if (!batch) {
    return null;
  }

  outputLines.push('Insert All');

  batch.valueLines.forEach(valueLine => {
    outputLines.push(
      `Into ${batch.insertLine.replace(/^Insert\s+into\s+/i, '')} ${batch.columnsLine.trim()} ${batch.valuesKeyword} ${valueLine}`
    );
  });

  outputLines.push('Select 1 from dual');
  outputLines.push(';');

  return null;
}

function flushBatch(batch, outputLines, mode) {
  if (mode === 'oracle-insert-all') {
    return flushOracleInsertAllBatch(batch, outputLines);
  }

  return flushValuesListBatch(batch, outputLines);
}

async function generateOptimizedFixture(config) {
  if (config.mode === 'prebuilt') {
    const content = await readFile(config.sourcePath, 'utf8');
    await mkdir(dirname(config.outputPath), { recursive: true });
    await writeFile(config.outputPath, content, 'utf8');

    return {
      engine: config.engine,
      sourceInsertCount: 0,
      optimizedInsertCount: 0,
      sourcePath: config.sourcePath,
      outputPath: config.outputPath,
      mode: config.mode,
    };
  }

  const input = await readFile(config.sourcePath, 'utf8');
  const lines = input.split(/\r?\n/);
  const outputLines = [
    `-- Generated from ${config.sourcePath.replace(`${repoRoot}/`, '')} by scripts/test-services/generate-optimized-sql-fixtures.mjs`,
    `-- Optimized with mode ${config.mode} and up to ${config.maxRowsPerInsert} rows per statement.`,
    '',
  ];

  let batch = null;
  let sourceInsertCount = 0;
  let optimizedInsertCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!isInsertLine(line)) {
      batch = flushBatch(batch, outputLines, config.mode);
      outputLines.push(line);
      continue;
    }

    const columnsLine = lines[index + 1];
    const valuesKeyword = lines[index + 2];
    const valueLine = lines[index + 3];
    const terminatorLine = lines[index + 4];

    if (
      columnsLine === undefined ||
      valuesKeyword === undefined ||
      valueLine === undefined ||
      terminatorLine === undefined
    ) {
      throw new Error(
        `Unexpected end of file while parsing ${config.engine} INSERT starting at line ${index + 1}.`
      );
    }

    if (valuesKeyword.trim().toLowerCase() !== 'values') {
      throw new Error(
        `Expected "Values" at line ${index + 3} in ${config.engine}, received: ${valuesKeyword}`
      );
    }

    if (terminatorLine.trim() !== ';') {
      throw new Error(
        `Expected ";" terminator at line ${index + 5} in ${config.engine}, received: ${terminatorLine}`
      );
    }

    const signature = `${line}\n${columnsLine}`;

    if (
      !batch ||
      batch.signature !== signature ||
      batch.valueLines.length >= config.maxRowsPerInsert
    ) {
      batch = flushBatch(batch, outputLines, config.mode);
      optimizedInsertCount += 1;
      batch = {
        signature,
        insertLine: line,
        columnsLine,
        valuesKeyword,
        valueLines: [],
      };
    }

    batch.valueLines.push(valueLine);
    sourceInsertCount += 1;
    index += 4;
  }

  batch = flushBatch(batch, outputLines, config.mode);

  await mkdir(dirname(config.outputPath), { recursive: true });
  await writeFile(config.outputPath, `${outputLines.join('\n')}\n`, 'utf8');

  return {
    engine: config.engine,
    sourceInsertCount,
    optimizedInsertCount,
    sourcePath: config.sourcePath,
    outputPath: config.outputPath,
    mode: config.mode,
  };
}

async function main() {
  const summaries = [];

  for (const config of datasetConfigs) {
    summaries.push(await generateOptimizedFixture(config));
  }

  summaries.forEach(summary => {
    if (summary.mode === 'prebuilt') {
      console.log(
        `[${summary.engine}] kept prebuilt optimized fixture at ${summary.outputPath}`
      );
      return;
    }

    console.log(
      [
        `[${summary.engine}] generated ${summary.outputPath}`,
        `source INSERT statements: ${summary.sourceInsertCount}`,
        `optimized statements: ${summary.optimizedInsertCount}`,
        `mode: ${summary.mode}`,
      ].join('\n')
    );
  });
}

await main();
