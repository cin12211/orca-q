import type { RawQueryCapabilities } from '../contracts';

/** Redis commands are one per line; SQL is split into statements. */
export function resolveStatementMode(
  capabilities: RawQueryCapabilities
): 'sql' | 'line' {
  return isRedisLanguage(capabilities) ? 'line' : 'sql';
}

export function isRedisLanguage(capabilities: RawQueryCapabilities): boolean {
  return capabilities.language === 'redis';
}
