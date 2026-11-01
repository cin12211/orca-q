import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getMinimumServerVersionNote } from '~/core/constants/minimum-server-versions';

describe('getMinimumServerVersionNote', () => {
  it('describes the minimum for gated engines', () => {
    expect(getMinimumServerVersionNote(DatabaseClientType.ORACLE)).toBe(
      'Requires Oracle 19c or newer; older servers cannot connect.'
    );
    expect(getMinimumServerVersionNote(DatabaseClientType.MSSQL)).toContain(
      'Azure SQL is supported.'
    );
    expect(
      getMinimumServerVersionNote(DatabaseClientType.COCKROACHDB)
    ).toContain('CockroachDB v23.2');
  });

  it('stays silent for other engines', () => {
    expect(getMinimumServerVersionNote(DatabaseClientType.POSTGRES)).toBeNull();
    expect(getMinimumServerVersionNote(null)).toBeNull();
  });
});
