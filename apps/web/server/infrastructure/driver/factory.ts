import type { Knex } from 'knex';
import { DatabaseClientType } from '~~/app/core/constants/database-client-type';
import {
  createManagedSqliteAdapter,
  isManagedSqliteProviderKind,
  type ManagedSqliteAdapterOptions,
} from '~~/server/infrastructure/driver/managed-sqlite';
import { isDesktopRuntime } from '~~/server/infrastructure/mcp/desktop-store';
import { isNoSqlClientType } from '~~/server/infrastructure/nosql';
import { CockroachAdapter } from './cockroachdb.adapter';
import { DuckDbAdapter } from './duckdb.adapter';
import { MssqlAdapter } from './mssql.adapter';
import { MysqlAdapter } from './mysql.adapter';
import { OracleAdapter } from './oracle.adapter';
import { PostgresAdapter } from './postgres.adapter';
import { SqliteAdapter } from './sqlite.adapter';
import type { IDatabaseAdapter } from './types';

export const DUCKDB_DESKTOP_ONLY_MESSAGE =
  'DuckDB connections are available only in the desktop app.';

type AdapterFactory = (
  connection: string | Knex.Config['connection']
) => IDatabaseAdapter;

const ADAPTER_FACTORIES: Partial<Record<DatabaseClientType, AdapterFactory>> = {
  [DatabaseClientType.POSTGRES]: connection => new PostgresAdapter(connection),
  [DatabaseClientType.MYSQL]: connection => new MysqlAdapter(connection),
  [DatabaseClientType.MARIADB]: connection =>
    new MysqlAdapter(connection, DatabaseClientType.MARIADB),
  [DatabaseClientType.ORACLE]: connection => new OracleAdapter(connection),
  [DatabaseClientType.SQLITE3]: connection => new SqliteAdapter(connection),
  [DatabaseClientType.COCKROACHDB]: connection =>
    new CockroachAdapter(connection),
  [DatabaseClientType.MSSQL]: connection => new MssqlAdapter(connection),
  [DatabaseClientType.DUCKDB]: connection => new DuckDbAdapter(connection),
};

export function createDatabaseAdapter(
  type: DatabaseClientType,
  connection: string | Knex.Config['connection'],
  options: ManagedSqliteAdapterOptions = {}
): IDatabaseAdapter {
  if (isNoSqlClientType(type)) {
    throw new Error(
      `${type} uses a dedicated NoSQL runtime and cannot be created through the SQL adapter factory.`
    );
  }

  if (
    type === DatabaseClientType.SQLITE3 &&
    isManagedSqliteProviderKind(options.providerKind)
  ) {
    return createManagedSqliteAdapter(options);
  }

  // DuckDB SQL reads any path the server can reach (read_text, read_csv, ...),
  // so it must never be reachable on a hosted web deployment.
  if (type === DatabaseClientType.DUCKDB && !isDesktopRuntime()) {
    throw new Error(DUCKDB_DESKTOP_ONLY_MESSAGE);
  }

  const factory = ADAPTER_FACTORIES[type];

  if (!factory) {
    throw new Error(`Database type '${type}' is not supported yet.`);
  }

  return factory(connection);
}
