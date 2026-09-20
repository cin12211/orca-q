import { BSON, ObjectId } from 'mongodb';

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

const ARRAY_VALUE_OPERATORS = new Set([
  '$and',
  '$or',
  '$in',
  '$nin',
  '$all',
  '$mod',
]);

const OBJECT_ID_LITERAL = /^ObjectId\((['"])([0-9a-fA-F]{24})\1\)$/;
const ISO_DATE_LITERAL = /^ISODate\((['"])(.+)\1\)$/;

type MongoFilter = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isBsonValue(value: unknown): boolean {
  return (
    value instanceof Date ||
    (isRecord(value) && typeof value._bsontype === 'string')
  );
}

function deserializeMongoEjson(value: unknown): unknown {
  if (!isRecord(value) && !Array.isArray(value)) return value;
  return BSON.EJSON.deserialize(value as Record<string, unknown>, {
    relaxed: false,
  });
}

function parseMongoLiteral(value: string): unknown {
  const objectIdMatch = value.match(OBJECT_ID_LITERAL);
  if (objectIdMatch) {
    return new ObjectId(objectIdMatch[2]);
  }

  const isoDateMatch = value.match(ISO_DATE_LITERAL);
  if (isoDateMatch) {
    const date = new Date(isoDateMatch[2]);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return value;
}

function normalizeValue(field: string, value: unknown): unknown {
  if (field === '_id' && typeof value === 'string') {
    if (ObjectId.isValid(value)) {
      return new ObjectId(value);
    }

    const parsedLiteral = parseMongoLiteral(value);
    if (parsedLiteral instanceof ObjectId) return parsedLiteral;

    throw new Error(
      `Invalid MongoDB document _id: "${value}". Expected a 24-character hexadecimal string or ObjectId("...").`
    );
  }

  if (Array.isArray(value)) {
    return value.map(item => normalizeValue(field, item));
  }

  if (isBsonValue(value)) return value;

  if (value && typeof value === 'object') {
    return normalizeMongoFilter(value as MongoFilter);
  }

  if (typeof value === 'string') return parseMongoLiteral(value);

  return value;
}

export function normalizeMongoFilter(filter: MongoFilter = {}): MongoFilter {
  const deserializedFilter = deserializeMongoEjson(filter);
  if (!isRecord(deserializedFilter)) {
    throw new Error('MongoDB filter must be an object');
  }

  return Object.fromEntries(
    Object.entries(deserializedFilter).map(([key, value]) => {
      if (key.startsWith('$') && !ALLOWED_OPERATORS.has(key)) {
        throw new Error(`Unsupported MongoDB filter operator: ${key}`);
      }

      if (
        key.startsWith('$') &&
        ARRAY_VALUE_OPERATORS.has(key) &&
        !Array.isArray(value)
      ) {
        throw new Error(
          `MongoDB filter operator ${key} requires an array value`
        );
      }

      return [
        key,
        key === '$regex'
          ? value
          : normalizeValue(key === '_id' ? '_id' : '', value),
      ];
    })
  );
}

export function buildMongoDocumentSelector(id: unknown): { _id: any } {
  if (id === undefined) {
    throw new Error('Invalid MongoDB document _id');
  }

  const deserializedId = deserializeMongoEjson(id);
  const normalizedId =
    typeof deserializedId === 'string'
      ? ObjectId.isValid(deserializedId)
        ? new ObjectId(deserializedId)
        : parseMongoLiteral(deserializedId)
      : deserializedId;

  return { _id: normalizedId as any };
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

export interface MongoCollectionName {
  name: string;
  properties: string[];
  size: number;
  count: number;
}

export async function listMongoCollectionNames(
  database: MongoCollectionsSource
): Promise<MongoCollectionName[]> {
  const collectionInfos = await database.listCollections().toArray();

  const collections = await Promise.all(
    collectionInfos.map(async info => {
      const stats = await database
        .command({ collStats: info.name })
        .catch(() => ({}) as MongoCollStats);

      return {
        name: info.name,
        properties: buildCollectionProperties(info),
        size: stats.storageSize ?? 0,
        count: stats.count ?? 0,
      };
    })
  );

  return collections.sort((a, b) => a.name.localeCompare(b.name));
}

interface MongoDatabaseStatsSource {
  command(command: Record<string, unknown>): Promise<{ totalSize?: number }>;
}

export async function getMongoDatabaseTotalSize(
  database: MongoDatabaseStatsSource
): Promise<number> {
  const stats = await database.command({ dbStats: 1 });
  return stats.totalSize ?? 0;
}

export interface MongoDatabaseStats {
  collections: number;
  views: number;
  objects: number;
  avgObjectSize: number;
  dataSize: number;
  storageSize: number;
  indexes: number;
  indexSize: number;
  totalSize: number;
}

interface MongoFullDatabaseStatsSource {
  command(command: Record<string, unknown>): Promise<{
    collections?: number;
    views?: number;
    objects?: number;
    avgObjSize?: number;
    dataSize?: number;
    storageSize?: number;
    indexes?: number;
    indexSize?: number;
    totalSize?: number;
  }>;
}

export async function getMongoDatabaseStats(
  database: MongoFullDatabaseStatsSource
): Promise<MongoDatabaseStats> {
  const stats = await database.command({ dbStats: 1 });

  return {
    collections: stats.collections ?? 0,
    views: stats.views ?? 0,
    objects: stats.objects ?? 0,
    avgObjectSize: stats.avgObjSize ?? 0,
    dataSize: stats.dataSize ?? 0,
    storageSize: stats.storageSize ?? 0,
    indexes: stats.indexes ?? 0,
    indexSize: stats.indexSize ?? 0,
    totalSize: stats.totalSize ?? 0,
  };
}

interface MongoCollectionMutationSource {
  createCollection(name: string): Promise<unknown>;
  renameCollection(fromName: string, toName: string): Promise<unknown>;
  dropCollection(name: string): Promise<unknown>;
}

export async function createMongoCollection(
  database: MongoCollectionMutationSource,
  name: string
): Promise<void> {
  await database.createCollection(name);
}

export async function renameMongoCollection(
  database: MongoCollectionMutationSource,
  fromName: string,
  toName: string
): Promise<void> {
  await database.renameCollection(fromName, toName);
}

export async function dropMongoCollection(
  database: MongoCollectionMutationSource,
  name: string
): Promise<void> {
  await database.dropCollection(name);
}

interface MongoDatabaseMutationSource {
  dropDatabase(): Promise<unknown>;
}

export async function dropMongoDatabase(
  database: MongoDatabaseMutationSource
): Promise<void> {
  await database.dropDatabase();
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

interface MongoIndexesSource {
  collection(name: string): {
    indexes(): Promise<Array<Record<string, unknown>>>;
  };
}

export interface MongoIndexInfo {
  name: string;
  key: Record<string, number | string>;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
}

export async function getMongoCollectionIndexes(
  database: MongoIndexesSource,
  collectionName: string
): Promise<MongoIndexInfo[]> {
  const indexes = await database.collection(collectionName).indexes();

  return indexes.map(index => ({
    name: String(index.name),
    key: index.key as Record<string, number | string>,
    unique: index.unique as boolean | undefined,
    sparse: index.sparse as boolean | undefined,
    expireAfterSeconds: index.expireAfterSeconds as number | undefined,
  }));
}

interface MongoListCollectionsFilterSource {
  listCollections(filter: Record<string, unknown>): {
    toArray(): Promise<Array<{ options?: Record<string, unknown> }>>;
  };
}

export interface MongoValidationInfo {
  validator: Record<string, unknown> | null;
  validationLevel: string | null;
  validationAction: string | null;
}

export async function getMongoCollectionValidation(
  database: MongoListCollectionsFilterSource,
  collectionName: string
): Promise<MongoValidationInfo> {
  const [info] = await database
    .listCollections({ name: collectionName })
    .toArray();
  const options = info?.options ?? {};

  return {
    validator: (options.validator as Record<string, unknown>) ?? null,
    validationLevel: (options.validationLevel as string) ?? null,
    validationAction: (options.validationAction as string) ?? null,
  };
}

export function serializeMongoDocument(document: Record<string, unknown>) {
  return BSON.EJSON.serialize(document, { relaxed: false });
}

export function serializeMongoValue(value: unknown) {
  return BSON.EJSON.serialize(value, { relaxed: false });
}

export function normalizeMongoDocument(document: Record<string, unknown>) {
  const normalizeValueDeep = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalizeValueDeep);

    if (isBsonValue(value)) return value;

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [
          key,
          normalizeValueDeep(nestedValue),
        ])
      );
    }

    return typeof value === 'string' ? parseMongoLiteral(value) : value;
  };

  const deserializedDocument = deserializeMongoEjson(document);
  if (!isRecord(deserializedDocument)) {
    throw new Error('MongoDB document must be an object');
  }

  return normalizeValueDeep(deserializedDocument) as Record<string, unknown>;
}
