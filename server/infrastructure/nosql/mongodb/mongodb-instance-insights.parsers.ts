import type {
  MongoCacheMetric,
  MongoConnectionsMetric,
  MongoMemoryMetric,
  MongoTopology,
} from '~/core/types/instance-insights.types';

type MongoDocument = Record<string, unknown>;

const asDocument = (value: unknown): MongoDocument | null =>
  value && typeof value === 'object' ? (value as MongoDocument) : null;

// The driver may hand back Long/Double wrappers; Number() unwraps both.
export const toNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const resolveTopology = (hello: MongoDocument | null): MongoTopology => {
  if (hello?.msg === 'isdbgrid') return 'sharded';
  if (typeof hello?.setName === 'string') return 'replicaSet';
  return 'standalone';
};

export const parseConnections = (
  status: MongoDocument
): MongoConnectionsMetric | null => {
  const connections = asDocument(status.connections);
  if (!connections) return null;

  return {
    current: toNumber(connections.current),
    available: toNumber(connections.available),
    totalCreated: toNumber(connections.totalCreated),
  };
};

export const parseMemory = (
  status: MongoDocument
): MongoMemoryMetric | null => {
  const memory = asDocument(status.mem);
  if (!memory) return null;

  return {
    residentMb: toNumber(memory.resident),
    virtualMb: toNumber(memory.virtual),
  };
};

export const parseCache = (status: MongoDocument): MongoCacheMetric | null => {
  const cache = asDocument(asDocument(status.wiredTiger)?.cache);
  if (!cache) return null;

  return {
    usedBytes: toNumber(cache['bytes currently in the cache']),
    maxBytes: toNumber(cache['maximum bytes configured']),
    dirtyBytes: toNumber(cache['tracked dirty bytes in the cache']),
  };
};
