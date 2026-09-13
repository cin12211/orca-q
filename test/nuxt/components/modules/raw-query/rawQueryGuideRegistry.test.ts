import { describe, expect, it } from 'vitest';
import {
  getRawQueryGuide,
  isRawQueryGuideSupported,
} from '~/components/modules/raw-query/registry/rawQueryGuideRegistry';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('raw query guide registry', () => {
  it.each([
    DatabaseClientType.POSTGRES,
    DatabaseClientType.MYSQL,
    DatabaseClientType.MARIADB,
  ])('registers the SQL guide for %s', clientType => {
    expect(isRawQueryGuideSupported(clientType)).toBe(true);
    expect(getRawQueryGuide(clientType)).toBeDefined();
  });

  it('registers a Mongo-specific guide', () => {
    expect(isRawQueryGuideSupported(DatabaseClientType.MONGODB)).toBe(true);
    expect(getRawQueryGuide(DatabaseClientType.MONGODB)).toBeDefined();
  });

  it.each([
    DatabaseClientType.MYSQL2,
    DatabaseClientType.SQLITE3,
    DatabaseClientType.REDIS,
  ])('does not show a guide for unregistered %s', clientType => {
    expect(isRawQueryGuideSupported(clientType)).toBe(false);
    expect(getRawQueryGuide(clientType)).toBeNull();
  });
});
