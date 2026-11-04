import { describe, expect, it } from 'vitest';
import {
  EConnectionFamily,
  EConnectionProviderKind,
} from '~/core/types/entities/connection.entity';
import {
  assertSupportedConnectionRuntime,
  buildUnsupportedConnectionMessage,
} from '~/server/infrastructure/nosql';

describe('NoSQL runtime guards', () => {
  it('explains that Redis cannot use the SQL adapter stack', () => {
    expect(
      buildUnsupportedConnectionMessage({
        family: EConnectionFamily.REDIS,
        providerKind: EConnectionProviderKind.REDIS_DIRECT,
      })
    ).toContain('SQL adapter stack');
  });

  it('allows direct SQL runtime dispatch', () => {
    expect(() =>
      assertSupportedConnectionRuntime({
        family: EConnectionFamily.SQL,
        providerKind: EConnectionProviderKind.DIRECT_SQL,
      })
    ).not.toThrow();
  });

  it('allows managed SQLite runtime dispatch', () => {
    expect(() =>
      assertSupportedConnectionRuntime({
        family: EConnectionFamily.SQL,
        providerKind: EConnectionProviderKind.TURSO,
      })
    ).not.toThrow();
  });
});
