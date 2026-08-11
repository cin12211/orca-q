import { ObjectId } from 'mongodb';

const ALLOWED_OPERATORS = new Set([
  '$and',
  '$or',
  '$eq',
  '$ne',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$in',
  '$nin',
  '$exists',
  '$regex',
]);

type MongoFilter = Record<string, unknown>;

function normalizeValue(field: string, value: unknown): unknown {
  if (field === '_id' && typeof value === 'string') {
    if (!ObjectId.isValid(value)) {
      throw new Error('Invalid MongoDB document _id');
    }
    return new ObjectId(value);
  }

  if (Array.isArray(value)) {
    return value.map(item => normalizeValue(field, item));
  }

  if (value && typeof value === 'object') {
    return normalizeMongoFilter(value as MongoFilter);
  }

  return value;
}

export function normalizeMongoFilter(filter: MongoFilter = {}): MongoFilter {
  return Object.fromEntries(
    Object.entries(filter).map(([key, value]) => {
      if (key.startsWith('$') && !ALLOWED_OPERATORS.has(key)) {
        throw new Error(`Unsupported MongoDB filter operator: ${key}`);
      }

      if (key.startsWith('$') && !Array.isArray(value) && key !== '$regex') {
        throw new Error(
          `MongoDB filter operator ${key} requires an array value`
        );
      }

      return [key, normalizeValue(key === '_id' ? '_id' : '', value)];
    })
  );
}

export function buildMongoDocumentSelector(id: string) {
  if (!ObjectId.isValid(id)) {
    throw new Error('Invalid MongoDB document _id');
  }

  return { _id: new ObjectId(id) };
}

export interface MongoCollectionSummary {
  name: string;
  properties: string[];
  documentCount: number;
  storageSize: number;
  dataSize: number;
  avgDocumentSize: number;
  indexCount: number;
  totalIndexSize: number;
}

interface MongoCollectionListInfo {
  name: string;
  type?: string;
  options?: { capped?: boolean };
}

interface MongoCollStats {
  count?: number;
  storageSize?: number;
  size?: number;
  avgObjSize?: number;
  nindexes?: number;
  totalIndexSize?: number;
}

interface MongoCollectionsSource {
  listCollections(): { toArray(): Promise<MongoCollectionListInfo[]> };
  command(command: Record<string, unknown>): Promise<MongoCollStats>;
}

function buildCollectionProperties(info: MongoCollectionListInfo): string[] {
  const properties: string[] = [];

  if (info.type === 'view') properties.push('View');
  if (info.options?.capped) properties.push('Capped');

  return properties;
}

export async function listMongoCollections(
  database: MongoCollectionsSource
): Promise<MongoCollectionSummary[]> {
  const collectionInfos = await database.listCollections().toArray();
  const collections = await Promise.all(
    collectionInfos.map(async info => {
      const stats = await database
        .command({ collStats: info.name })
        .catch(() => ({}) as MongoCollStats);

      return {
        name: info.name,
        properties: buildCollectionProperties(info),
        documentCount: stats.count ?? 0,
        storageSize: stats.storageSize ?? 0,
        dataSize: stats.size ?? 0,
        avgDocumentSize: stats.avgObjSize ?? 0,
        indexCount: stats.nindexes ?? 0,
        totalIndexSize: stats.totalIndexSize ?? 0,
      };
    })
  );

  return collections.sort((a, b) => a.name.localeCompare(b.name));
}

interface MongoAdminSource {
  db(): {
    admin(): { listDatabases(): Promise<{ databases: { name: string }[] }> };
  };
}

export async function listMongoDatabases(
  client: MongoAdminSource
): Promise<string[]> {
  const { databases } = await client.db().admin().listDatabases();
  return databases
    .map(database => database.name)
    .sort((a, b) => a.localeCompare(b));
}

export function serializeMongoDocument(document: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(document).map(([key, value]) => [
      key,
      value instanceof ObjectId ? value.toHexString() : value,
    ])
  );
}
