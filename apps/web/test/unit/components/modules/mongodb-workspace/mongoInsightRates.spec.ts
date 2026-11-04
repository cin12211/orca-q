import { describe, expect, it } from 'vitest';
import { computeMongoOpcounterRates } from '~/components/modules/mongodb-workspace/utils';
import type { MongoOverviewInsight } from '~/core/types/instance-insights.types';

function sample(
  capturedAt: string,
  query: number,
  insert = 0
): MongoOverviewInsight {
  return {
    version: null,
    host: null,
    process: null,
    storageEngine: null,
    uptimeSeconds: null,
    connections: null,
    opcounters: {
      insert,
      query,
      update: 0,
      delete: 0,
      getmore: 0,
      command: 0,
    },
    memory: null,
    network: null,
    capturedAt,
    serverStatusError: null,
  };
}

describe('computeMongoOpcounterRates', () => {
  it('returns null for the first sample', () => {
    expect(
      computeMongoOpcounterRates(undefined, sample('2026-01-01T00:00:00Z', 5))
    ).toBeNull();
  });

  it('divides counter deltas by elapsed seconds', () => {
    const rates = computeMongoOpcounterRates(
      sample('2026-01-01T00:00:00Z', 10, 0),
      sample('2026-01-01T00:00:05Z', 60, 25)
    );

    expect(rates?.query).toBe(10);
    expect(rates?.insert).toBe(5);
    expect(rates?.total).toBe(15);
  });

  it('returns null when counters reset after a restart', () => {
    expect(
      computeMongoOpcounterRates(
        sample('2026-01-01T00:00:00Z', 100),
        sample('2026-01-01T00:00:05Z', 3)
      )
    ).toBeNull();
  });

  it('returns null when serverStatus was not available', () => {
    const current = { ...sample('2026-01-01T00:00:05Z', 1), opcounters: null };
    expect(
      computeMongoOpcounterRates(sample('2026-01-01T00:00:00Z', 0), current)
    ).toBeNull();
  });
});
