import { describe, expect, it } from 'vitest';
import { resolveRawQueryCapabilities } from '~/components/modules/driver/shared/raw-query';
import {
  isRedisLanguage,
  resolveStatementMode,
} from '~/components/modules/raw-query/utils/resolveStatementMode';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('resolveStatementMode', () => {
  it('splits Redis input line by line', () => {
    const capabilities = resolveRawQueryCapabilities(DatabaseClientType.REDIS);
    expect(resolveStatementMode(capabilities)).toBe('line');
  });

  it('splits SQL input by statement', () => {
    const capabilities = resolveRawQueryCapabilities(
      DatabaseClientType.POSTGRES
    );
    expect(resolveStatementMode(capabilities)).toBe('sql');
  });
});

describe('capabilities drive the editor language and Format support', () => {
  it('treats SQL capabilities as statement mode with Format enabled', () => {
    const capabilities = resolveRawQueryCapabilities(
      DatabaseClientType.POSTGRES
    );
    expect(isRedisLanguage(capabilities)).toBe(false);
    expect(resolveStatementMode(capabilities)).toBe('sql');
    expect(capabilities.supportsFormat).toBe(true);
  });

  it('treats Redis capabilities as line mode with Format disabled', () => {
    const capabilities = resolveRawQueryCapabilities(DatabaseClientType.REDIS);
    expect(isRedisLanguage(capabilities)).toBe(true);
    expect(resolveStatementMode(capabilities)).toBe('line');
    expect(capabilities.supportsFormat).toBe(false);
  });
});
