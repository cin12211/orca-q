import { describe, expect, it } from 'vitest';
import {
  parseCache,
  parseConnections,
  parseMemory,
  resolveTopology,
} from '~/server/infrastructure/nosql/mongodb/mongodb-instance-insights.parsers';

describe('resolveTopology', () => {
  it('detects mongos, replica sets and standalone servers', () => {
    expect(resolveTopology({ msg: 'isdbgrid' })).toBe('sharded');
    expect(resolveTopology({ setName: 'rs0' })).toBe('replicaSet');
    expect(resolveTopology({ isWritablePrimary: true })).toBe('standalone');
    expect(resolveTopology(null)).toBe('standalone');
  });
});

describe('serverStatus parsers', () => {
  const status = {
    connections: { current: 12, available: 838848, totalCreated: 40 },
    mem: { resident: 120, virtual: 2800 },
    wiredTiger: {
      cache: {
        'bytes currently in the cache': 1024,
        'maximum bytes configured': 4096,
        'tracked dirty bytes in the cache': 16,
      },
    },
  };

  it('maps connections, memory and cache', () => {
    expect(parseConnections(status)).toEqual({
      current: 12,
      available: 838848,
      totalCreated: 40,
    });
    expect(parseMemory(status)).toEqual({ residentMb: 120, virtualMb: 2800 });
    expect(parseCache(status)).toEqual({
      usedBytes: 1024,
      maxBytes: 4096,
      dirtyBytes: 16,
    });
  });

  it('returns null when a block is missing (restricted serverStatus)', () => {
    expect(parseConnections({})).toBeNull();
    expect(parseMemory({})).toBeNull();
    expect(parseCache({})).toBeNull();
  });
});
