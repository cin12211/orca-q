import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent, h } from 'vue';
import type { Component } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MariadbRawQuery from '~/components/modules/driver/mariadb/raw-query/containers/MariadbRawQuery.vue';
import MongoRawQuery from '~/components/modules/driver/mongodb/raw-query/containers/MongoRawQuery.vue';
import MssqlRawQuery from '~/components/modules/driver/mssql/raw-query/containers/MssqlRawQuery.vue';
import MysqlRawQuery from '~/components/modules/driver/mysql/raw-query/containers/MysqlRawQuery.vue';
import OracleRawQuery from '~/components/modules/driver/oracle/raw-query/containers/OracleRawQuery.vue';
import PostgresRawQuery from '~/components/modules/driver/postgres/raw-query/containers/PostgresRawQuery.vue';
import RedisRawQuery from '~/components/modules/driver/redis/raw-query/containers/RedisRawQuery.vue';
import UnsupportedRawQuery from '~/components/modules/driver/shared/raw-query/containers/UnsupportedRawQuery.vue';
import { resolveRawQueryComponent } from '~/components/modules/driver/shared/raw-query/resolver';
import { defineEngineEntry } from '~/components/modules/driver/shared/raw-query/resolver/resolveRawQueryComponent';
import SqliteRawQuery from '~/components/modules/driver/sqlite/raw-query/containers/SqliteRawQuery.vue';
import { DatabaseClientType } from '~/core/constants/database-client-type';

/** `defineAsyncComponent` keeps its loader on the returned wrapper. */
const loadEntry = async (component: Component): Promise<unknown> => {
  const loader = (
    component as { __asyncLoader?: () => Promise<{ default?: unknown }> }
  ).__asyncLoader;

  expect(loader).toBeTypeOf('function');

  const loaded = (await loader!()) as { default?: unknown };

  return loaded.default ?? loaded;
};

/** An async component has no root node until it resolves, so mount it under a host. */
const mountInHost = (entry: Component, errorHandler?: () => void) =>
  mount(defineComponent({ render: () => h(entry) }), {
    global: { config: { errorHandler } },
  });

describe('resolveRawQueryComponent', () => {
  it.each([
    DatabaseClientType.POSTGRES,
    DatabaseClientType.MYSQL,
    DatabaseClientType.MYSQL2,
    DatabaseClientType.MARIADB,
    DatabaseClientType.SQLITE3,
    DatabaseClientType.BETTER_SQLITE3,
    DatabaseClientType.ORACLE,
    DatabaseClientType.MSSQL,
    DatabaseClientType.REDIS,
    DatabaseClientType.MONGODB,
  ])('resolves a real entry for %s', type => {
    expect(resolveRawQueryComponent(type)).not.toBe(UnsupportedRawQuery);
  });

  it('maps both SQLite client types to the same entry', () => {
    expect(resolveRawQueryComponent(DatabaseClientType.BETTER_SQLITE3)).toBe(
      resolveRawQueryComponent(DatabaseClientType.SQLITE3)
    );
  });

  it('maps both MySQL client types to the same entry', () => {
    expect(resolveRawQueryComponent(DatabaseClientType.MYSQL2)).toBe(
      resolveRawQueryComponent(DatabaseClientType.MYSQL)
    );
  });

  it.each([
    [DatabaseClientType.POSTGRES, PostgresRawQuery],
    [DatabaseClientType.MYSQL, MysqlRawQuery],
    [DatabaseClientType.MYSQL2, MysqlRawQuery],
    [DatabaseClientType.MARIADB, MariadbRawQuery],
    [DatabaseClientType.SQLITE3, SqliteRawQuery],
    [DatabaseClientType.BETTER_SQLITE3, SqliteRawQuery],
    [DatabaseClientType.ORACLE, OracleRawQuery],
    [DatabaseClientType.MSSQL, MssqlRawQuery],
    [DatabaseClientType.REDIS, RedisRawQuery],
    [DatabaseClientType.MONGODB, MongoRawQuery],
  ])('lazy-loads the %s entry from its own container', async (type, entry) => {
    await expect(loadEntry(resolveRawQueryComponent(type))).resolves.toBe(
      entry
    );
  });

  it.each([DatabaseClientType.SNOWFLAKE, undefined])(
    'falls back to the unsupported state for %s',
    type => {
      expect(resolveRawQueryComponent(type)).toBe(UnsupportedRawQuery);
    }
  );

  it('tells the user raw query is unavailable for this engine', async () => {
    const wrapper = await mountSuspended(UnsupportedRawQuery);

    expect(wrapper.text()).toContain('Raw query is not supported');
    expect(wrapper.text()).toContain(
      'This database engine does not have a raw query editor yet.'
    );
  });

  it('renders the error state when an entry chunk fails to load', async () => {
    const failingEntry = defineEngineEntry(() =>
      Promise.reject(new Error('chunk failed'))
    );
    const errorHandler = vi.fn();
    const wrapper = mountInHost(failingEntry, errorHandler);

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('Failed to load the raw query editor')
    );
    expect(wrapper.text()).toContain('Check your connection and reload');
  });

  it('renders the loading state while an entry chunk is pending', async () => {
    const pendingEntry = defineEngineEntry(() => new Promise(() => undefined));
    const wrapper = mountInHost(pendingEntry);

    await vi.waitFor(() =>
      expect(wrapper.findComponent({ name: 'LoadingOverlay' }).exists()).toBe(
        true
      )
    );
  });
});
