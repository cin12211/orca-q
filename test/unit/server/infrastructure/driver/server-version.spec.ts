import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { normalizeConnectionError } from '~/server/infrastructure/driver/connection-error';
import {
  UNSUPPORTED_SERVER_VERSION_CODE,
  UnsupportedServerVersionError,
  assertMinimumServerVersion,
  parseServerVersion,
} from '~/server/infrastructure/driver/server-version';

describe('server version gate', () => {
  it('parses major.minor from version strings', () => {
    expect(
      parseServerVersion('CockroachDB CCL v24.3.5 (aarch64-unknown-linux-gnu)')
    ).toEqual({ major: 24, minor: 3 });
    expect(parseServerVersion('16.0.4305.5')).toEqual({ major: 16, minor: 0 });
    expect(parseServerVersion('unknown')).toBeNull();
  });

  it('accepts supported versions', () => {
    expect(() =>
      assertMinimumServerVersion(DatabaseClientType.MSSQL, '14.0.1000.169')
    ).not.toThrow();
    expect(() =>
      assertMinimumServerVersion(
        DatabaseClientType.COCKROACHDB,
        'CockroachDB CCL v23.2.0'
      )
    ).not.toThrow();
  });

  it('rejects older or unparseable versions', () => {
    expect(() =>
      assertMinimumServerVersion(DatabaseClientType.MSSQL, '13.0.5026.0')
    ).toThrow(UnsupportedServerVersionError);
    expect(() =>
      assertMinimumServerVersion(
        DatabaseClientType.COCKROACHDB,
        'CockroachDB CCL v23.1.11'
      )
    ).toThrow(/CockroachDB v23\.2 or newer is required/);
    expect(() =>
      assertMinimumServerVersion(DatabaseClientType.MSSQL, '')
    ).toThrow(UnsupportedServerVersionError);
  });

  it('ignores engines without a minimum', () => {
    expect(() =>
      assertMinimumServerVersion(DatabaseClientType.POSTGRES, '9.0')
    ).not.toThrow();
  });

  it('surfaces the version message on the connection form', () => {
    const error = new UnsupportedServerVersionError(
      DatabaseClientType.MSSQL,
      '13.0',
      'SQL Server 2017'
    );

    expect(normalizeConnectionError(error)).toMatchObject({
      code: UNSUPPORTED_SERVER_VERSION_CODE,
      message:
        'SQL Server 2017 or newer is required. The server reports version 13.0.',
    });
  });
});
