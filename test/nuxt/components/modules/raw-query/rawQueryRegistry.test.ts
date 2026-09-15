import { describe, expect, it } from 'vitest';
import {
  RAW_QUERY_REGISTRY,
  getRawQueryProfile,
} from '~/components/modules/raw-query/registry';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('Raw Query Registry (Master & Layout UI)', () => {
  it('registers every DatabaseClientType in RAW_QUERY_REGISTRY', () => {
    expect(Object.keys(RAW_QUERY_REGISTRY).sort()).toEqual(
      Object.values(DatabaseClientType).sort()
    );
  });

  it('falls back to default SQL profile when databaseType is undefined', () => {
    const profile = getRawQueryProfile(undefined);
    expect(profile).toBeDefined();
    expect(profile.isVariableSupported).toBe(true);
    expect(profile.footer.leftComponents.length).toBeGreaterThan(0);
    expect(profile.footer.rightComponents.length).toBeGreaterThan(0);
  });

  describe('MongoDB Profile', () => {
    it('configures MongoDB header layout correctly with leftComponents', () => {
      const profile = getRawQueryProfile(DatabaseClientType.MONGODB);
      expect(profile.header.leftComponents?.length).toBe(1);
      expect(profile.isVariableSupported).toBe(false);
    });

    it('registers cursor info, guide and Mongo actions in footer', () => {
      const profile = getRawQueryProfile(DatabaseClientType.MONGODB);
      expect(profile.isFormatSupported).toBe(true);
      expect(profile.footer.leftComponents.length).toBe(2); // CursorInfo + MongoGuide
      expect(profile.footer.rightComponents.length).toBe(2); // MongoFormat + MongoExecute
    });
  });

  describe('PostgreSQL Profile', () => {
    it('configures PostgreSQL header layout correctly', () => {
      const profile = getRawQueryProfile(DatabaseClientType.POSTGRES);
      expect(profile.header.leftComponents).toBeUndefined();
      expect(profile.header.rightComponents).toBeUndefined();
      expect(profile.isVariableSupported).toBe(true);
      expect(profile.isFormatSupported).toBe(true);
    });

    it('registers cursor info, SQL guide, format, explain and execute in footer', () => {
      const profile = getRawQueryProfile(DatabaseClientType.POSTGRES);
      expect(profile.footer.leftComponents.length).toBe(2); // CursorInfo + SqlGuide
      expect(profile.footer.rightComponents.length).toBe(3); // SqlFormat + PostgresExplain + Execute
    });
  });

  describe('Redis Profile', () => {
    it('configures Redis header layout correctly with rightComponents', () => {
      const profile = getRawQueryProfile(DatabaseClientType.REDIS);
      expect(profile.isVariableSupported).toBe(false);
      expect(profile.header.rightComponents?.length).toBe(1);
      expect(profile.isFormatSupported).toBe(false);
    });

    it('registers only cursor info on left and execute on right in footer', () => {
      const profile = getRawQueryProfile(DatabaseClientType.REDIS);
      expect(profile.footer.leftComponents.length).toBe(1); // CursorInfo
      expect(profile.footer.rightComponents.length).toBe(1); // Execute
    });
  });

  describe('Standard SQL Profiles', () => {
    it('configures MySQL with guide and format/execute actions', () => {
      const profile = getRawQueryProfile(DatabaseClientType.MYSQL);
      expect(profile.isVariableSupported).toBe(true);
      expect(profile.isFormatSupported).toBe(true);
      expect(profile.footer.leftComponents.length).toBe(2); // CursorInfo + SqlGuide
      expect(profile.footer.rightComponents.length).toBe(2); // SqlFormat + Execute
    });

    it('configures SQLite3 without guide popover', () => {
      const profile = getRawQueryProfile(DatabaseClientType.SQLITE3);
      expect(profile.isVariableSupported).toBe(false);
      expect(profile.isFormatSupported).toBe(true);
      expect(profile.footer.leftComponents.length).toBe(1); // CursorInfo only
      expect(profile.footer.rightComponents.length).toBe(2); // SqlFormat + Execute
    });
  });

  describe('Profile Plugin Attachments', () => {
    it('attaches postgresPlugin to postgresRawQueryProfile', () => {
      const profile = getRawQueryProfile(DatabaseClientType.POSTGRES);
      expect(profile.plugin?.name).toBe('postgres-plugin');
    });

    it('attaches mongoPlugin to mongoRawQueryProfile', () => {
      const profile = getRawQueryProfile(DatabaseClientType.MONGODB);
      expect(profile.plugin?.name).toBe('mongo-plugin');
    });

    it('attaches redisPlugin to redisRawQueryProfile', () => {
      const profile = getRawQueryProfile(DatabaseClientType.REDIS);
      expect(profile.plugin?.name).toBe('redis-plugin');
    });

    it('attaches sqlitePlugin to sqlite profile and postgresPlugin to standard sql profiles', () => {
      const sqliteProfile = getRawQueryProfile(DatabaseClientType.SQLITE3);
      expect(sqliteProfile.plugin?.name).toBe('sqlite-plugin');

      const betterSqliteProfile = getRawQueryProfile(
        DatabaseClientType.BETTER_SQLITE3
      );
      expect(betterSqliteProfile.plugin?.name).toBe('sqlite-plugin');

      const mysqlProfile = getRawQueryProfile(DatabaseClientType.MYSQL);
      expect(mysqlProfile.plugin?.name).toBe('postgres-plugin');

      const mariadbProfile = getRawQueryProfile(DatabaseClientType.MARIADB);
      expect(mariadbProfile.plugin?.name).toBe('postgres-plugin');
    });
  });
});
