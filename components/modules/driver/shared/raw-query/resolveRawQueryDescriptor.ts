import { MARIADB_RAW_QUERY_DESCRIPTOR } from '~/components/modules/driver/mariadb/raw-query/descriptors';
import { MSSQL_RAW_QUERY_DESCRIPTOR } from '~/components/modules/driver/mssql/raw-query/descriptors';
import { MYSQL_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/mysql/raw-query/capabilities';
import { MYSQL_RAW_QUERY_DESCRIPTOR } from '~/components/modules/driver/mysql/raw-query/descriptors';
import { mysql2CommandResult } from '~/components/modules/driver/mysql/raw-query/services';
import { ORACLE_RAW_QUERY_DESCRIPTOR } from '~/components/modules/driver/oracle/raw-query/descriptors';
import { POSTGRES_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/postgres/raw-query/capabilities';
import { postgresCommandResult } from '~/components/modules/driver/postgres/raw-query/services';
import { REDIS_RAW_QUERY_DESCRIPTOR } from '~/components/modules/driver/redis/raw-query/descriptors';
import { SQLITE_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/sqlite/raw-query/capabilities';
import { SQLITE_RAW_QUERY_DESCRIPTOR } from '~/components/modules/driver/sqlite/raw-query/descriptors';
import { betterSqlite3CommandResult } from '~/components/modules/driver/sqlite/raw-query/services';
import type {
  RawQueryCapabilities,
  RawQueryDriverDescriptor,
} from '~/components/modules/raw-query/contracts';
import { DatabaseClientType } from '~/core/constants/database-client-type';

/**
 * Engines raw query supports. A type missing from this map has no raw query
 * surface — the caller renders the unsupported state instead of guessing.
 *
 * Entries reuse each driver's own descriptor so the capability/handler pairing
 * lives in one place. MYSQL2 and BETTER_SQLITE3 have no entry component of
 * their own, so they stay spelled out with their dedicated handler.
 */
const RAW_QUERY_DESCRIPTORS: Partial<
  Record<DatabaseClientType, RawQueryDriverDescriptor>
> = {
  [DatabaseClientType.POSTGRES]: {
    capabilities: POSTGRES_RAW_QUERY_CAPABILITIES,
    commandResultHandler: postgresCommandResult,
  },
  [DatabaseClientType.MYSQL]: MYSQL_RAW_QUERY_DESCRIPTOR,
  [DatabaseClientType.MYSQL2]: {
    capabilities: MYSQL_RAW_QUERY_CAPABILITIES,
    commandResultHandler: mysql2CommandResult,
  },
  [DatabaseClientType.MARIADB]: MARIADB_RAW_QUERY_DESCRIPTOR,
  [DatabaseClientType.SQLITE3]: SQLITE_RAW_QUERY_DESCRIPTOR,
  [DatabaseClientType.BETTER_SQLITE3]: {
    capabilities: SQLITE_RAW_QUERY_CAPABILITIES,
    commandResultHandler: betterSqlite3CommandResult,
  },
  [DatabaseClientType.ORACLE]: ORACLE_RAW_QUERY_DESCRIPTOR,
  [DatabaseClientType.MSSQL]: MSSQL_RAW_QUERY_DESCRIPTOR,
  [DatabaseClientType.REDIS]: REDIS_RAW_QUERY_DESCRIPTOR,
};

export function resolveRawQueryDescriptor(
  type: DatabaseClientType | undefined
): RawQueryDriverDescriptor | undefined {
  if (!type) return undefined;
  return RAW_QUERY_DESCRIPTORS[type];
}

export function resolveRawQueryCapabilities(
  type: DatabaseClientType | undefined
): RawQueryCapabilities | undefined {
  return resolveRawQueryDescriptor(type)?.capabilities;
}
