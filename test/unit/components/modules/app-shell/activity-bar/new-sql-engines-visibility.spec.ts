import { describe, expect, it } from 'vitest';
import { getVisibleActivityItems } from '~/components/modules/app-shell/activity-bar/utils/getVisibleActivityItems';
import {
  DatabaseClientType,
  isBackupSupportedClientType,
  isPostgresCompatibleClientType,
} from '~/core/constants/database-client-type';
import { ActivityBarItemType } from '~/core/stores/useActivityBarStore';

const ALL_ITEMS = [
  'Explorer',
  'Schemas',
  'ERDiagram',
  'UsersRoles',
  'DatabaseTools',
  'Agent',
] as const;

describe('SQL Server and CockroachDB feature gating', () => {
  it.each([DatabaseClientType.MSSQL, DatabaseClientType.COCKROACHDB])(
    'hides Users & Roles and the AI agent for %s',
    type => {
      expect(getVisibleActivityItems([...ALL_ITEMS], type)).toEqual([
        ActivityBarItemType.Explorer,
        ActivityBarItemType.Schemas,
        ActivityBarItemType.ErdDiagram,
        ActivityBarItemType.DatabaseTools,
      ]);
    }
  );

  it('has no Backup & Restore for the new engines only', () => {
    expect(isBackupSupportedClientType(DatabaseClientType.MSSQL)).toBe(false);
    expect(isBackupSupportedClientType(DatabaseClientType.COCKROACHDB)).toBe(
      false
    );
    expect(isBackupSupportedClientType(DatabaseClientType.ORACLE)).toBe(false);
    expect(isBackupSupportedClientType(DatabaseClientType.POSTGRES)).toBe(true);
  });

  it('treats CockroachDB as Postgres-compatible', () => {
    expect(isPostgresCompatibleClientType(DatabaseClientType.COCKROACHDB)).toBe(
      true
    );
    expect(isPostgresCompatibleClientType(DatabaseClientType.POSTGRES)).toBe(
      true
    );
    expect(isPostgresCompatibleClientType(DatabaseClientType.MSSQL)).toBe(
      false
    );
  });
});
