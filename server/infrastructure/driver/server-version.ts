import { DatabaseClientType } from '~/core/constants/database-client-type';

export const UNSUPPORTED_SERVER_VERSION_CODE =
  'ORCAQ_UNSUPPORTED_SERVER_VERSION';

export interface ServerVersion {
  major: number;
  minor: number;
}

interface MinimumServerVersion extends ServerVersion {
  label: string;
}

/**
 * Oldest server versions OrcaQ supports per engine. Connections to older
 * servers are rejected up front instead of failing later on catalog queries
 * the server does not understand.
 */
export const MINIMUM_SERVER_VERSIONS: Partial<
  Record<DatabaseClientType, MinimumServerVersion>
> = {
  // SQL Server 2017 is major version 14.
  [DatabaseClientType.MSSQL]: { major: 14, minor: 0, label: 'SQL Server 2017' },
  [DatabaseClientType.COCKROACHDB]: {
    major: 23,
    minor: 2,
    label: 'CockroachDB v23.2',
  },
};

export class UnsupportedServerVersionError extends Error {
  readonly code = UNSUPPORTED_SERVER_VERSION_CODE;

  constructor(
    readonly dbType: DatabaseClientType,
    readonly detectedVersion: string,
    readonly minimumLabel: string
  ) {
    super(
      `${minimumLabel} or newer is required. The server reports version ${detectedVersion || 'unknown'}.`
    );
    this.name = 'UnsupportedServerVersionError';
  }
}

export function compareServerVersions(
  left: ServerVersion,
  right: ServerVersion
): number {
  if (left.major !== right.major) {
    return left.major - right.major;
  }

  return left.minor - right.minor;
}

/** Parses the first `major.minor` pair found in a version string. */
export function parseServerVersion(raw: string): ServerVersion | null {
  const match = /(\d+)\.(\d+)/.exec(raw);

  if (!match) {
    return null;
  }

  return { major: Number(match[1]), minor: Number(match[2]) };
}

/**
 * Throws `UnsupportedServerVersionError` when `rawVersion` is older than the
 * minimum for `dbType`. Unparseable versions are rejected too, because the
 * catalog queries for these engines depend on the minimum version.
 */
export function assertMinimumServerVersion(
  dbType: DatabaseClientType,
  rawVersion: string
): void {
  const minimum = MINIMUM_SERVER_VERSIONS[dbType];

  if (!minimum) {
    return;
  }

  const parsed = parseServerVersion(rawVersion);

  if (!parsed || compareServerVersions(parsed, minimum) < 0) {
    throw new UnsupportedServerVersionError(
      dbType,
      parsed ? `${parsed.major}.${parsed.minor}` : rawVersion,
      minimum.label
    );
  }
}
