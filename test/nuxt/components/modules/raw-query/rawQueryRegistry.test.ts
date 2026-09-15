import { describe, expect, it } from 'vitest';
import {
  RAW_QUERY_PLUGIN_REGISTRY,
  RAW_QUERY_REGISTRY,
  getRawQueryPlugin,
  getRawQueryProfile,
} from '~/components/modules/raw-query/registry';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('Raw Query Registry (Master & Layout UI)', () => {
  it('registers every DatabaseClientType in RAW_QUERY_PLUGIN_REGISTRY and RAW_QUERY_REGISTRY', () => {
    expect(Object.keys(RAW_QUERY_PLUGIN_REGISTRY).sort()).toEqual(
      Object.values(DatabaseClientType).sort()
    );
    expect(RAW_QUERY_REGISTRY).toBe(RAW_QUERY_PLUGIN_REGISTRY);
  });

  it('falls back to default SQL plugin when databaseType is undefined', () => {
    const plugin = getRawQueryPlugin(undefined);
    expect(plugin).toBeDefined();
    expect(plugin.isVariableSupported).toBe(true);
    expect(plugin.footer?.leftComponents.length).toBeGreaterThan(0);
    expect(plugin.footer?.rightComponents.length).toBeGreaterThan(0);
  });

  describe('MongoDB Plugin', () => {
    it('configures MongoDB header layout correctly with leftComponents', () => {
      const plugin = getRawQueryPlugin(DatabaseClientType.MONGODB);
      expect(plugin.header?.leftComponents?.length).toBe(1);
      expect(plugin.isVariableSupported).toBe(false);
    });

    it('registers cursor info, guide and Mongo actions in footer', () => {
      const plugin = getRawQueryPlugin(DatabaseClientType.MONGODB);
      expect(plugin.isFormatSupported).toBe(true);
      expect(plugin.footer?.leftComponents.length).toBe(2); // CursorInfo + MongoGuide
      expect(plugin.footer?.rightComponents.length).toBe(2); // MongoFormat + MongoExecute
    });
  });

  describe('PostgreSQL Plugin', () => {
    it('configures PostgreSQL header layout correctly', () => {
      const plugin = getRawQueryPlugin(DatabaseClientType.POSTGRES);
      expect(plugin.header?.leftComponents).toBeUndefined();
      expect(plugin.header?.rightComponents).toBeUndefined();
      expect(plugin.isVariableSupported).toBe(true);
      expect(plugin.isFormatSupported).toBe(true);
    });

    it('registers cursor info, SQL guide, format, explain and execute in footer', () => {
      const plugin = getRawQueryPlugin(DatabaseClientType.POSTGRES);
      expect(plugin.footer?.leftComponents.length).toBe(2); // CursorInfo + SqlGuide
      expect(plugin.footer?.rightComponents.length).toBe(3); // SqlFormat + PostgresExplain + Execute
    });
  });

  describe('Redis Plugin', () => {
    it('configures Redis header layout correctly with rightComponents', () => {
      const plugin = getRawQueryPlugin(DatabaseClientType.REDIS);
      expect(plugin.isVariableSupported).toBe(false);
      expect(plugin.header?.rightComponents?.length).toBe(1);
      expect(plugin.isFormatSupported).toBe(false);
    });

    it('registers only cursor info on left and execute on right in footer', () => {
      const plugin = getRawQueryPlugin(DatabaseClientType.REDIS);
      expect(plugin.footer?.leftComponents.length).toBe(1); // CursorInfo
      expect(plugin.footer?.rightComponents.length).toBe(1); // Execute
    });
  });

  describe('Standard SQL Plugins', () => {
    it('configures MySQL with guide and format/execute actions', () => {
      const plugin = getRawQueryPlugin(DatabaseClientType.MYSQL);
      expect(plugin.isVariableSupported).toBe(true);
      expect(plugin.isFormatSupported).toBe(true);
      expect(plugin.footer?.leftComponents.length).toBe(2); // CursorInfo + SqlGuide
      expect(plugin.footer?.rightComponents.length).toBe(2); // SqlFormat + Execute
    });

    it('configures SQLite3 without guide popover', () => {
      const plugin = getRawQueryPlugin(DatabaseClientType.SQLITE3);
      expect(plugin.isVariableSupported).toBe(false);
      expect(plugin.isFormatSupported).toBe(true);
      expect(plugin.footer?.leftComponents.length).toBe(1); // CursorInfo only
      expect(plugin.footer?.rightComponents.length).toBe(2); // SqlFormat + Execute
    });
  });

  describe('Plugin Registry Mapping', () => {
    it('maps postgresPlugin for PostgreSQL', () => {
      const plugin = getRawQueryPlugin(DatabaseClientType.POSTGRES);
      expect(plugin.name).toBe('postgres-plugin');
    });

    it('maps mongoPlugin for MongoDB', () => {
      const plugin = getRawQueryPlugin(DatabaseClientType.MONGODB);
      expect(plugin.name).toBe('mongo-plugin');
    });

    it('maps redisPlugin for Redis', () => {
      const plugin = getRawQueryPlugin(DatabaseClientType.REDIS);
      expect(plugin.name).toBe('redis-plugin');
    });

    it('maps sqlitePlugin to sqlite and sql-plugin to standard sql databases', () => {
      const sqlitePlugin = getRawQueryPlugin(DatabaseClientType.SQLITE3);
      expect(sqlitePlugin.name).toBe('sqlite-plugin');

      const betterSqlitePlugin = getRawQueryPlugin(
        DatabaseClientType.BETTER_SQLITE3
      );
      expect(betterSqlitePlugin.name).toBe('sqlite-plugin');

      const mysqlPlugin = getRawQueryPlugin(DatabaseClientType.MYSQL);
      expect(mysqlPlugin.name).toBe('sql-plugin');

      const mariadbPlugin = getRawQueryPlugin(DatabaseClientType.MARIADB);
      expect(mariadbPlugin.name).toBe('sql-plugin');
    });

    it('maintains backwards compatibility with getRawQueryProfile', () => {
      expect(getRawQueryProfile(DatabaseClientType.POSTGRES)).toBe(
        getRawQueryPlugin(DatabaseClientType.POSTGRES)
      );
    });
  });
});
