import { describe, expect, it } from 'vitest';
import { MONGODB_RAW_QUERY_CAPABILITIES } from '~/components/modules/driver/mongodb/raw-query/capabilities';
import {
  resolveRawQueryCapabilities,
  resolveRawQueryDescriptor,
} from '~/components/modules/driver/shared/raw-query';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('resolveRawQueryCapabilities', () => {
  it('gives PostgreSQL separate parser and highlight dialects', () => {
    const capabilities = resolveRawQueryCapabilities(
      DatabaseClientType.POSTGRES
    );

    expect(capabilities?.language).toBe('sql');
    expect(capabilities?.parserDialect).toBeDefined();
    expect(capabilities?.highlightDialect).toBeDefined();
    expect(capabilities?.parserDialect).not.toBe(
      capabilities?.highlightDialect
    );
    expect(capabilities?.keywordCompletion).toBeDefined();
  });

  it('marks Redis as a non-SQL language with no variables and no formatting', () => {
    const capabilities = resolveRawQueryCapabilities(DatabaseClientType.REDIS);

    expect(capabilities?.language).toBe('redis');
    expect(capabilities?.supportsVariables).toBe(false);
    expect(capabilities?.supportsFormat).toBe(false);
    expect(capabilities?.parserDialect).toBeUndefined();
  });

  it('uses the "at" parameter style only for MSSQL', () => {
    expect(
      resolveRawQueryCapabilities(DatabaseClientType.MSSQL)?.parameterStyle
    ).toBe('at');
    expect(
      resolveRawQueryCapabilities(DatabaseClientType.POSTGRES)?.parameterStyle
    ).toBe('colon');
  });

  it('enables variables for SQLite', () => {
    expect(
      resolveRawQueryCapabilities(DatabaseClientType.SQLITE3)?.supportsVariables
    ).toBe(true);
    expect(
      resolveRawQueryCapabilities(DatabaseClientType.BETTER_SQLITE3)
        ?.supportsVariables
    ).toBe(true);
  });

  it('maps driver aliases onto the same capabilities', () => {
    expect(resolveRawQueryCapabilities(DatabaseClientType.MYSQL2)).toBe(
      resolveRawQueryCapabilities(DatabaseClientType.MYSQL)
    );
    expect(resolveRawQueryCapabilities(DatabaseClientType.BETTER_SQLITE3)).toBe(
      resolveRawQueryCapabilities(DatabaseClientType.SQLITE3)
    );
  });

  it('returns undefined for engines raw query does not support', () => {
    expect(
      resolveRawQueryCapabilities(DatabaseClientType.SNOWFLAKE)
    ).toBeUndefined();
    expect(resolveRawQueryCapabilities(undefined)).toBeUndefined();
  });
});

describe('MongoDB capabilities', () => {
  it('resolves a descriptor for MONGODB with the generic command result handler', () => {
    const descriptor = resolveRawQueryDescriptor(DatabaseClientType.MONGODB);

    expect(descriptor).toBeDefined();
    expect(descriptor?.capabilities).toBe(MONGODB_RAW_QUERY_CAPABILITIES);
    expect(
      descriptor?.commandResultHandler('MONGODB', 3).category
    ).toBeDefined();
  });
});
