import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  assertNativeBackupSupported,
  buildNativeBackupFileName,
  getNativeBackupCapability,
  getNativeBackupFileExtension,
  getNativeBackupImportExtensions,
  getNativeBackupImportTool,
  getOracleNativeBackupUnsupportedReason,
  resolveNativeExportFormat,
  sanitizeBackupFileSegment,
} from '~/server/infrastructure/database/backup/native-backup';

describe('native-backup capability helpers', () => {
  it('returns PostgreSQL native capabilities with both archive and plain sql formats', () => {
    const capability = getNativeBackupCapability(DatabaseClientType.POSTGRES);

    expect(capability.supported).toBe(true);
    expect(capability.defaultExportFormat).toBe('custom');
    expect(capability.exportToolCandidates).toEqual(['pg_dump']);
    expect(capability.importToolCandidates).toEqual(['pg_restore', 'psql']);
    expect(capability.formatOptions).toEqual([
      {
        format: 'custom',
        fileExtension: '.dump',
        fileKind: 'archive',
        label: 'PostgreSQL custom archive (.dump)',
        importTool: 'pg_restore',
      },
      {
        format: 'plain',
        fileExtension: '.sql',
        fileKind: 'sql',
        label: 'PostgreSQL plain SQL script (.sql)',
        importTool: 'psql',
      },
    ]);
  });

  it('prefers mysqlpump before mysqldump for MySQL-family exports', () => {
    const capability = getNativeBackupCapability(DatabaseClientType.MARIADB);

    expect(capability.supported).toBe(true);
    expect(capability.exportToolCandidates).toEqual(['mysqlpump', 'mysqldump']);
    expect(capability.importToolCandidates).toEqual(['mysql']);
    expect(capability.defaultExportFormat).toBe('plain');
    expect(capability.formatOptions[0]?.fileExtension).toBe('.sql');
  });

  it('marks Oracle native backup unsupported until Data Pump server directory is configured', () => {
    const capability = getNativeBackupCapability(DatabaseClientType.ORACLE);

    expect(capability.supported).toBe(false);
    expect(capability.exportToolCandidates).toEqual(['expdp']);
    expect(capability.importToolCandidates).toEqual(['impdp']);
    expect(capability.reason).toContain('DIRECTORY object');
    expect(getOracleNativeBackupUnsupportedReason()).toContain(
      'artifact retrieval configuration'
    );
  });

  it('builds a sanitized file name with the DB-specific extension', () => {
    expect(sanitizeBackupFileSegment('inventory/prod eu-west')).toBe(
      'inventory-prod-eu-west'
    );

    expect(
      buildNativeBackupFileName(
        'inventory/prod eu-west',
        DatabaseClientType.POSTGRES,
        new Date('2026-04-25T12:34:56.789Z'),
        'custom'
      )
    ).toBe('inventory-prod-eu-west_2026-04-25T12-34-56-789Z.dump');

    expect(
      buildNativeBackupFileName(
        'inventory/prod eu-west',
        DatabaseClientType.POSTGRES,
        new Date('2026-04-25T12:34:56.789Z'),
        'plain'
      )
    ).toBe('inventory-prod-eu-west_2026-04-25T12-34-56-789Z.sql');
  });

  it('resolves export format, file extensions, and import tool by database family', () => {
    expect(
      resolveNativeExportFormat(DatabaseClientType.POSTGRES, 'native')
    ).toBe('custom');
    expect(
      resolveNativeExportFormat(DatabaseClientType.POSTGRES, 'plain')
    ).toBe('plain');
    expect(
      getNativeBackupFileExtension(DatabaseClientType.POSTGRES, 'plain')
    ).toBe('.sql');
    expect(
      getNativeBackupImportExtensions(DatabaseClientType.POSTGRES)
    ).toEqual(['.dump', '.sql']);
    expect(
      getNativeBackupImportTool(DatabaseClientType.POSTGRES, 'backup.dump')
    ).toBe('pg_restore');
    expect(
      getNativeBackupImportTool(DatabaseClientType.POSTGRES, 'backup.sql')
    ).toBe('psql');
  });

  it('throws a native unsupported error for Oracle', () => {
    expect(() =>
      assertNativeBackupSupported(DatabaseClientType.ORACLE)
    ).toThrow(/DIRECTORY object/);
  });
});
