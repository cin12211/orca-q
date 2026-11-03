import { describe, expect, it } from 'vitest';
import { splitSqlServerBatches } from '~/server/infrastructure/database/adapters/query/mssql/split-batches';

describe('splitSqlServerBatches', () => {
  it('splits on GO lines', () => {
    const batches = splitSqlServerBatches(
      'CREATE TABLE t (id INT)\nGO\nINSERT INTO t VALUES (1)\ngo\n'
    );

    expect(batches).toEqual([
      { sql: 'CREATE TABLE t (id INT)', repeat: 1 },
      { sql: 'INSERT INTO t VALUES (1)', repeat: 1 },
    ]);
  });

  it('reads a repeat count and ignores trailing comments', () => {
    const batches = splitSqlServerBatches(
      'INSERT INTO t DEFAULT VALUES\nGO 3 -- three rows'
    );

    expect(batches).toEqual([
      { sql: 'INSERT INTO t DEFAULT VALUES', repeat: 3 },
    ]);
  });

  it('keeps GO inside strings, brackets and block comments', () => {
    const script = [
      "SELECT 'line one",
      'GO',
      "line three' AS txt",
      '/*',
      'GO',
      '*/',
      'SELECT [a',
      'GO',
      'b] FROM t',
    ].join('\n');

    expect(splitSqlServerBatches(script)).toEqual([{ sql: script, repeat: 1 }]);
  });

  it('does not treat GOTO or identifiers starting with GO as separators', () => {
    const script = 'GOTO done\nSELECT 1 AS go_value';

    expect(splitSqlServerBatches(script)).toEqual([{ sql: script, repeat: 1 }]);
  });

  it('drops empty batches', () => {
    expect(splitSqlServerBatches('GO\n\nGO\nSELECT 1\nGO')).toEqual([
      { sql: 'SELECT 1', repeat: 1 },
    ]);
  });
});
