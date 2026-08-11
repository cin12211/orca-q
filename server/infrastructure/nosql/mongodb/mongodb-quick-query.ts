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

export function serializeMongoDocument(document: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(document).map(([key, value]) => [
      key,
      value instanceof ObjectId ? value.toHexString() : value,
    ])
  );
}
