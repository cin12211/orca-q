import { DatabaseClientType } from './database-client-type';

export interface MinimumServerVersion {
  major: number;
  minor: number;
  label: string;
  /** Extra guidance for the connection form (cloud variants, …). */
  note?: string;
}

/**
 * Oldest server versions OrcaQ supports per engine. Older servers are rejected
 * up front instead of failing later on catalog queries they do not understand.
 */
export const MINIMUM_SERVER_VERSIONS: Partial<
  Record<DatabaseClientType, MinimumServerVersion>
> = {
  // SQL Server 2017 is major version 14.
  [DatabaseClientType.MSSQL]: {
    major: 14,
    minor: 0,
    label: 'SQL Server 2017',
    note: 'Azure SQL is supported.',
  },
  [DatabaseClientType.COCKROACHDB]: {
    major: 23,
    minor: 2,
    label: 'CockroachDB v23.2',
  },
  [DatabaseClientType.ORACLE]: {
    major: 19,
    minor: 0,
    label: 'Oracle 19c',
  },
};

/** Connection-form hint for engines with a minimum server version. */
export function getMinimumServerVersionNote(
  type?: DatabaseClientType | null
): string | null {
  const minimum = type ? MINIMUM_SERVER_VERSIONS[type] : undefined;

  if (!minimum) {
    return null;
  }

  return [
    `Requires ${minimum.label} or newer; older servers cannot connect.`,
    minimum.note,
  ]
    .filter(Boolean)
    .join(' ');
}
