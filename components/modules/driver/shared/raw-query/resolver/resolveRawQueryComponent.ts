import type { AsyncComponentLoader, Component } from 'vue';
import { defineAsyncComponent } from 'vue';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  RawQueryEntryError,
  RawQueryEntryLoading,
  UnsupportedRawQuery,
} from '../containers';

/** Avoids a spinner flash when the chunk is already cached and resolves fast. */
const ENTRY_LOADING_DELAY_MS = 200;

/**
 * Builds one async engine entry with loading and error states.
 *
 * `suspensible: false` is required: Vue ignores `loadingComponent` and
 * `errorComponent` for a suspensible async component under a `<Suspense>`,
 * and Nuxt wraps pages in one.
 */
export const defineEngineEntry = (loader: AsyncComponentLoader) =>
  defineAsyncComponent({
    loader,
    loadingComponent: RawQueryEntryLoading,
    errorComponent: RawQueryEntryError,
    delay: ENTRY_LOADING_DELAY_MS,
    suspensible: false,
  });

/**
 * Each engine loads as its own chunk: PostgreSQL pulls the ECharts-backed
 * EXPLAIN timeline, and no other engine should pay for it.
 *
 * The entries are imported by their full container path on purpose: the driver
 * root barrels do not re-export `containers/`, because those containers import
 * `driver/shared/raw-query`, which would close an import cycle.
 */
const postgresEntry = defineEngineEntry(
  () =>
    import(
      '~/components/modules/driver/postgres/raw-query/containers/PostgresRawQuery.vue'
    )
);

/** MySQL and MySQL2 are the same engine behind two client identifiers. */
const mysqlEntry = defineEngineEntry(
  () =>
    import(
      '~/components/modules/driver/mysql/raw-query/containers/MysqlRawQuery.vue'
    )
);

const mariadbEntry = defineEngineEntry(
  () =>
    import(
      '~/components/modules/driver/mariadb/raw-query/containers/MariadbRawQuery.vue'
    )
);

/** `sqlite3` and `better-sqlite3` share one editor. */
const sqliteEntry = defineEngineEntry(
  () =>
    import(
      '~/components/modules/driver/sqlite/raw-query/containers/SqliteRawQuery.vue'
    )
);

const oracleEntry = defineEngineEntry(
  () =>
    import(
      '~/components/modules/driver/oracle/raw-query/containers/OracleRawQuery.vue'
    )
);

const mssqlEntry = defineEngineEntry(
  () =>
    import(
      '~/components/modules/driver/mssql/raw-query/containers/MssqlRawQuery.vue'
    )
);

const redisEntry = defineEngineEntry(
  () =>
    import(
      '~/components/modules/driver/redis/raw-query/containers/RedisRawQuery.vue'
    )
);

const mongoEntry = defineEngineEntry(
  () =>
    import(
      '~/components/modules/driver/mongodb/raw-query/containers/MongoRawQuery.vue'
    )
);

const RAW_QUERY_COMPONENTS: Partial<Record<DatabaseClientType, Component>> = {
  [DatabaseClientType.POSTGRES]: postgresEntry,
  [DatabaseClientType.MYSQL]: mysqlEntry,
  [DatabaseClientType.MYSQL2]: mysqlEntry,
  [DatabaseClientType.MARIADB]: mariadbEntry,
  [DatabaseClientType.SQLITE3]: sqliteEntry,
  [DatabaseClientType.BETTER_SQLITE3]: sqliteEntry,
  [DatabaseClientType.ORACLE]: oracleEntry,
  [DatabaseClientType.MSSQL]: mssqlEntry,
  [DatabaseClientType.REDIS]: redisEntry,
  [DatabaseClientType.MONGODB]: mongoEntry,
};

/**
 * Picks the raw query entry for a connection type. Engines without a raw query
 * editor — and a still unknown connection — fall back to the unsupported state.
 */
export function resolveRawQueryComponent(
  type: DatabaseClientType | undefined
): Component {
  if (!type) return UnsupportedRawQuery;

  return RAW_QUERY_COMPONENTS[type] ?? UnsupportedRawQuery;
}
