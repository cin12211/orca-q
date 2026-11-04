import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  normalizeMetadataTypeAliasDatabaseFamily,
  resolveMetadataTypeAlias,
} from '~/server/infrastructure/database/adapters/metadata';

describe('metadata type alias resolver', () => {
  it('normalizes database aliases to a supported metadata family', () => {
    expect(
      normalizeMetadataTypeAliasDatabaseFamily(DatabaseClientType.MYSQL2)
    ).toBe(DatabaseClientType.MYSQL);
  });

  it('maps postgres raw types through the shared rules', () => {
    expect(
      resolveMetadataTypeAlias(
        DatabaseClientType.POSTGRES,
        'character varying(255)'
      )
    ).toBe('varchar(255)');
    expect(
      resolveMetadataTypeAlias(DatabaseClientType.POSTGRES, 'integer')
    ).toBe('int4');
    expect(
      resolveMetadataTypeAlias(DatabaseClientType.POSTGRES, 'smallserial')
    ).toBe('serial2');
  });

  it('maps oracle and mysql families while preserving unknown types', () => {
    expect(
      resolveMetadataTypeAlias(DatabaseClientType.ORACLE, 'VARCHAR2(64)')
    ).toBe('varchar(64)');
    expect(resolveMetadataTypeAlias(DatabaseClientType.MYSQL, 'boolean')).toBe(
      'bool'
    );
    expect(
      resolveMetadataTypeAlias(DatabaseClientType.SQLITE3, 'custom_type')
    ).toBe('custom_type');
  });
});
