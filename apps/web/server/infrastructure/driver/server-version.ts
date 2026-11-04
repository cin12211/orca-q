import { DatabaseClientType } from '~/core/constants/database-client-type';
import { MINIMUM_SERVER_VERSIONS } from '~/core/constants/minimum-server-versions';

export const UNSUPPORTED_SERVER_VERSION_CODE =
  'ORCAQ_UNSUPPORTED_SERVER_VERSION';

export interface ServerVersion {
  major: number;
  minor: number;
}

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
