import * as oracledb from 'oracledb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MysqlAdapter,
  withMysqlTypeOptions,
} from '~/server/infrastructure/driver/mysql.adapter';
import {
  applyOracleSessionDateFormats,
  ORACLE_SET_SESSION_DATE_FORMATS_SQL,
  OracleAdapter,
} from '~/server/infrastructure/driver/oracle.adapter';

const adapters: { knex: { destroy: () => Promise<void> } }[] = [];

afterEach(async () => {
  await Promise.all(adapters.splice(0).map(adapter => adapter.knex.destroy()));
});

describe('MySQL / MariaDB date handling', () => {
  it('adds dateStrings to a connection URL, keeping other params', () => {
    const result = withMysqlTypeOptions(
      'mysql://u:p@db.local:3306/app?ssl=%7B%7D&charset=utf8mb4'
    ) as string;
    const url = new URL(result);

    expect(url.searchParams.get('dateStrings')).toBe('true');
    expect(url.searchParams.get('charset')).toBe('utf8mb4');
    expect(url.searchParams.get('ssl')).toBe('{}');
    expect(url.username).toBe('u');
    expect(url.pathname).toBe('/app');
  });

  it('overrides dateStrings=false given in the URL', () => {
    const result = withMysqlTypeOptions(
      'mysql://u:p@db.local/app?dateStrings=false'
    ) as string;

    expect(new URL(result).searchParams.get('dateStrings')).toBe('true');
  });

  it('adds dateStrings to a connection object without dropping fields', () => {
    const ssl = { rejectUnauthorized: false };

    expect(
      withMysqlTypeOptions({ host: 'db', user: 'u', database: 'app', ssl })
    ).toEqual({
      host: 'db',
      user: 'u',
      database: 'app',
      ssl,
      dateStrings: true,
    });
  });

  it('passes the option to the mysql2 connection knex creates', () => {
    const adapter = new MysqlAdapter('mysql://u:p@127.0.0.1:3306/app');
    adapters.push(adapter);

    expect(adapter.knex.client.connectionSettings).toMatchObject({
      dateStrings: true,
      host: '127.0.0.1',
      database: 'app',
    });
  });
});

describe('Oracle date handling', () => {
  it('fetches CLOB and DATE / TIMESTAMP values as strings', () => {
    const adapter = new OracleAdapter('oracledb://u:p@127.0.0.1:1521/FREEPDB1');
    adapters.push(adapter);

    expect(adapter.knex.client.fetchAsString).toEqual([
      oracledb.CLOB,
      oracledb.DATE,
    ]);
    expect(adapter.knex.client.config.pool.afterCreate).toBe(
      applyOracleSessionDateFormats
    );
  });

  it('sets full-precision session formats Oracle can read back', () => {
    expect(ORACLE_SET_SESSION_DATE_FORMATS_SQL).toBe(
      "ALTER SESSION SET NLS_DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS' " +
        "NLS_TIMESTAMP_FORMAT = 'YYYY-MM-DD HH24:MI:SS.FF' " +
        "NLS_TIMESTAMP_TZ_FORMAT = 'YYYY-MM-DD HH24:MI:SS.FF TZR'"
    );
  });

  it('applies the formats to each new session before handing it out', async () => {
    const connection = { execute: vi.fn().mockResolvedValue({}) };
    const done = vi.fn();

    applyOracleSessionDateFormats(connection, done);
    await vi.waitFor(() => expect(done).toHaveBeenCalled());

    expect(connection.execute).toHaveBeenCalledWith(
      ORACLE_SET_SESSION_DATE_FORMATS_SQL
    );
    expect(done).toHaveBeenCalledWith(null, connection);
  });

  it('fails the new session when the formats cannot be applied', async () => {
    const error = new Error('ORA-00922');
    const connection = { execute: vi.fn().mockRejectedValue(error) };
    const done = vi.fn();

    applyOracleSessionDateFormats(connection, done);
    await vi.waitFor(() => expect(done).toHaveBeenCalled());

    expect(done).toHaveBeenCalledWith(error, connection);
  });
});
