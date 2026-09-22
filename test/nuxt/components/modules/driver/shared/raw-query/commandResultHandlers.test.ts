import { describe, expect, it } from 'vitest';
import { resolveRawQueryDescriptor } from '~/components/modules/driver/shared/raw-query';
import { DatabaseClientType } from '~/core/constants/database-client-type';

const run = (type: DatabaseClientType, command: string, rowCount: number) =>
  resolveRawQueryDescriptor(type)!.commandResultHandler(command, rowCount);

describe('command result handlers via the descriptor', () => {
  it('uses the MySQL-style handler for MariaDB mutations', () => {
    const result = run(DatabaseClientType.MARIADB, 'TRUNCATE TABLE users', 0);

    expect(result.isMutation).toBe(true);
    expect(result.message).toBe('TRUNCATE successful.');
    expect(result.category).toBe('DML');
  });

  it('keeps Oracle merge mutation messages intact', () => {
    const result = run(DatabaseClientType.ORACLE, 'MERGE', 3);

    expect(result.isMutation).toBe(true);
    expect(result.message).toBe('MERGE successful. 3 rows affected.');
    expect(result.category).toBe('DML');
  });

  it('reports a PostgreSQL SELECT as a non-mutation', () => {
    const result = run(DatabaseClientType.POSTGRES, 'SELECT', 3);

    expect(result.isMutation).toBe(false);
    expect(result.category).toBe('DML');
  });

  it('reports a PostgreSQL UPDATE as a mutation with the row count', () => {
    const result = run(DatabaseClientType.POSTGRES, 'UPDATE', 7);

    expect(result.isMutation).toBe(true);
    expect(result.message).toContain('7');
  });

  it('gives MySQL2 the same output as MySQL (the classes are behaviorally identical)', () => {
    for (const [command, expected] of [
      ['OPTIMIZE', 'OPTIMIZE successful.'],
      ['TRUNCATE TABLE users', 'TRUNCATE successful.'],
      ['UPDATE', 'UPDATE successful. 4 rows affected.'],
    ] as const) {
      const mysql = run(DatabaseClientType.MYSQL, command, 4);
      const mysql2 = run(DatabaseClientType.MYSQL2, command, 4);

      expect(mysql2).toEqual(mysql);
      expect(mysql2.message).toBe(expected);
    }
  });

  it('gives Redis the generic handler output', () => {
    expect(run(DatabaseClientType.REDIS, 'GET', 1)).toEqual({
      isMutation: false,
      message: '',
      category: 'UNKNOWN',
    });
    expect(run(DatabaseClientType.REDIS, 'SET', 1)).toEqual({
      isMutation: true,
      message: 'SET successful.',
      category: 'SYSTEM',
    });
  });
});

type Expected = [string, number, boolean, string, string];

const ROWS_AFFECTED = (cmd: string, n: number) =>
  `${cmd} successful. ${n} rows affected.`;

/** [command, rowCount, isMutation, message, category] captured from the pre-split handlers. */
const EXPECTATIONS: Record<string, [DatabaseClientType[], Expected[]]> = {
  postgres: [
    [DatabaseClientType.POSTGRES],
    [
      ['SELECT', 2, false, '', 'DML'],
      ['INSERT', 2, true, ROWS_AFFECTED('INSERT', 2), 'DML'],
      ['UPDATE', 2, true, ROWS_AFFECTED('UPDATE', 2), 'DML'],
      ['DELETE', 2, true, ROWS_AFFECTED('DELETE', 2), 'DML'],
      ['TRUNCATE', 2, true, 'TRUNCATE successful.', 'DML'],
      ['MERGE', 2, true, 'MERGE successful.', 'DML'],
      ['FROBNICATE', 2, false, '', 'UNKNOWN'],
    ],
  ],
  mysqlFamily: [
    [
      DatabaseClientType.MYSQL,
      DatabaseClientType.MYSQL2,
      DatabaseClientType.MARIADB,
    ],
    [
      ['SELECT', 2, false, '', 'DML'],
      ['INSERT', 2, true, ROWS_AFFECTED('INSERT', 2), 'DML'],
      ['UPDATE', 2, true, ROWS_AFFECTED('UPDATE', 2), 'DML'],
      ['DELETE', 2, true, ROWS_AFFECTED('DELETE', 2), 'DML'],
      ['TRUNCATE', 2, true, 'TRUNCATE successful.', 'DML'],
      ['MERGE', 2, true, 'MERGE successful.', 'DML'],
      ['OPTIMIZE', 2, true, 'OPTIMIZE successful.', 'UNKNOWN'],
      ['FROBNICATE', 2, false, '', 'UNKNOWN'],
    ],
  ],
  sqlite: [
    [DatabaseClientType.SQLITE3, DatabaseClientType.BETTER_SQLITE3],
    [
      ['SELECT', 2, false, '', 'DML'],
      ['INSERT', 2, true, 'INSERT successful. 2 row(s) affected.', 'DML'],
      ['UPDATE', 2, true, ROWS_AFFECTED('UPDATE', 2), 'DML'],
      ['DELETE', 2, true, ROWS_AFFECTED('DELETE', 2), 'DML'],
      ['TRUNCATE', 2, true, 'TRUNCATE successful.', 'DML'],
      ['MERGE', 2, true, 'MERGE successful.', 'DML'],
      ['FROBNICATE', 2, false, '', 'UNKNOWN'],
    ],
  ],
  mssql: [
    [DatabaseClientType.MSSQL],
    [
      ['SELECT', 2, false, '', 'DML'],
      ['INSERT', 2, true, ROWS_AFFECTED('INSERT', 2), 'DML'],
      ['UPDATE', 2, true, ROWS_AFFECTED('UPDATE', 2), 'DML'],
      ['DELETE', 2, true, ROWS_AFFECTED('DELETE', 2), 'DML'],
      ['TRUNCATE', 2, true, 'TRUNCATE successful.', 'DML'],
      ['MERGE', 2, true, ROWS_AFFECTED('MERGE', 2), 'DML'],
      ['FROBNICATE', 2, false, '', 'UNKNOWN'],
    ],
  ],
  oracle: [
    [DatabaseClientType.ORACLE],
    [
      ['SELECT', 2, false, '', 'DML'],
      ['INSERT', 2, true, ROWS_AFFECTED('INSERT', 2), 'DML'],
      ['UPDATE', 2, true, ROWS_AFFECTED('UPDATE', 2), 'DML'],
      ['DELETE', 2, true, ROWS_AFFECTED('DELETE', 2), 'DML'],
      ['TRUNCATE', 2, true, 'TRUNCATE successful.', 'DML'],
      ['MERGE', 2, true, ROWS_AFFECTED('MERGE', 2), 'DML'],
      ['FROBNICATE', 2, false, '', 'UNKNOWN'],
    ],
  ],
  redis: [
    [DatabaseClientType.REDIS],
    [
      ['SELECT', 2, false, '', 'DML'],
      ['INSERT', 2, true, ROWS_AFFECTED('INSERT', 2), 'DML'],
      ['UPDATE', 2, true, ROWS_AFFECTED('UPDATE', 2), 'DML'],
      ['DELETE', 2, true, ROWS_AFFECTED('DELETE', 2), 'DML'],
      ['TRUNCATE', 2, true, 'TRUNCATE successful.', 'DML'],
      ['MERGE', 2, true, 'MERGE successful.', 'DML'],
      ['FROBNICATE', 2, false, '', 'UNKNOWN'],
    ],
  ],
};

describe('per-engine output matches the pre-split handlers', () => {
  for (const [engine, [types, rows]] of Object.entries(EXPECTATIONS)) {
    for (const type of types) {
      it.each(rows)(
        `${engine}/${type}: %s (%i rows)`,
        (cmd, n, isMut, msg, cat) => {
          expect(run(type, cmd, n)).toEqual({
            isMutation: isMut,
            message: msg,
            category: cat,
          });
        }
      );
    }
  }
});
