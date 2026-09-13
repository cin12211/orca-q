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
    expect(profile.header.supportsVariables).toBe(true);
    expect(profile.footer.leftComponents.length).toBeGreaterThan(0);
    expect(profile.footer.rightComponents.length).toBeGreaterThan(0);
  });

  describe('MongoDB Profile', () => {
    it('configures MongoDB header layout correctly with leftComponents', () => {
      const profile = getRawQueryProfile(DatabaseClientType.MONGODB);
      expect(profile.header.leftComponents?.length).toBe(1);
      expect(profile.header.supportsVariables).toBe(false);
    });

    it('registers cursor info, guide and Mongo actions in footer', () => {
      const profile = getRawQueryProfile(DatabaseClientType.MONGODB);
      expect(profile.footer.leftComponents.length).toBe(2); // CursorInfo + MongoGuide
      expect(profile.footer.rightComponents.length).toBe(2); // MongoFormat + MongoExecute
    });
  });

  describe('PostgreSQL Profile', () => {
    it('configures PostgreSQL header layout correctly', () => {
      const profile = getRawQueryProfile(DatabaseClientType.POSTGRES);
      expect(profile.header.leftComponents).toBeUndefined();
      expect(profile.header.rightComponents).toBeUndefined();
      expect(profile.header.supportsVariables).toBe(true);
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
      expect(profile.header.supportsVariables).toBe(false);
      expect(profile.header.rightComponents?.length).toBe(1);
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
      expect(profile.header.supportsVariables).toBe(true);
      expect(profile.footer.leftComponents.length).toBe(2); // CursorInfo + SqlGuide
      expect(profile.footer.rightComponents.length).toBe(2); // SqlFormat + Execute
    });

    it('configures SQLite3 without guide popover', () => {
      const profile = getRawQueryProfile(DatabaseClientType.SQLITE3);
      expect(profile.header.supportsVariables).toBe(false);
      expect(profile.footer.leftComponents.length).toBe(1); // CursorInfo only
      expect(profile.footer.rightComponents.length).toBe(2); // SqlFormat + Execute
    });
  });
});
