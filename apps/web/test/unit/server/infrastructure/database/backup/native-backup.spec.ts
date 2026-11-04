import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { afterEach } from 'vitest';
import { vi } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  assertNativeBackupSupported,
  buildNativeBackupFileName,
  ensureNativeBackupOperationAvailable,
  getNativeBackupCapability,
  getNativeBackupFileExtension,
  getNativeBackupImportExtensions,
  getNativeBackupImportTool,
  getNativeBackupRuntimeCapability,
  getOracleNativeBackupUnsupportedReason,
  resolveNativeExportFormat,
  sanitizeBackupFileSegment,
} from '~/server/infrastructure/database/backup/native-backup';

const tempDirectories: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();

  await Promise.all(
    tempDirectories
      .splice(0, tempDirectories.length)
      .map(directory => rm(directory, { recursive: true, force: true }))
  );
});

async function createFakeTool(name: string) {
  const directory = await mkdtemp(join(tmpdir(), 'heraq-native-tools-'));
  const executablePath = join(directory, name);

  tempDirectories.push(directory);

  await writeFile(executablePath, '#!/bin/sh\nexit 0\n', 'utf8');
  await chmod(executablePath, 0o755);

  return directory;
}

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

  it('detects partial PostgreSQL tool availability from PATH', async () => {
    const fakeToolDir = await createFakeTool('pg_dump');
    const fakeToolPath = join(fakeToolDir, 'pg_dump');

    vi.stubEnv('PATH', fakeToolDir);

    const capability = await getNativeBackupRuntimeCapability(
      DatabaseClientType.POSTGRES
    );

    expect(capability.available).toBe(true);
    expect(capability.exportAvailable).toBe(true);
    expect(capability.importAvailable).toBe(false);
    expect(capability.availableExportTools).toEqual(['pg_dump']);
    expect(capability.availableExportToolPaths).toEqual([
      {
        tool: 'pg_dump',
        path: fakeToolPath,
      },
    ]);
    expect(capability.missingImportTools).toEqual(['pg_restore', 'psql']);
  });

  it('returns multiple executable paths when more than one version is available on PATH', async () => {
    const firstToolDir = await createFakeTool('pg_dump');
    const secondToolDir = await createFakeTool('pg_dump');

    vi.stubEnv('PATH', `${firstToolDir}${delimiter}${secondToolDir}`);

    const capability = await getNativeBackupRuntimeCapability(
      DatabaseClientType.POSTGRES
    );

    expect(capability.availableExportTools).toEqual(['pg_dump']);
    expect(capability.availableExportToolPaths).toEqual([
      {
        tool: 'pg_dump',
        path: join(firstToolDir, 'pg_dump'),
      },
      {
        tool: 'pg_dump',
        path: join(secondToolDir, 'pg_dump'),
      },
    ]);
  });

  it('blocks export when no native tool is installed on PATH', async () => {
    const fakeToolDir = await mkdtemp(
      join(tmpdir(), 'heraq-empty-native-tools-')
    );
    tempDirectories.push(fakeToolDir);

    vi.stubEnv('PATH', fakeToolDir);

    await expect(
      ensureNativeBackupOperationAvailable(
        DatabaseClientType.POSTGRES,
        'export'
      )
    ).rejects.toThrow(/Native backup requires pg_dump on PATH/);
  });
});
