import type { MongoDocument } from '../types';

export function buildMongoPreviewFields(
  document: MongoDocument,
  maxFields = 3
): { key: string; value: unknown }[] {
  const fields: { key: string; value: unknown }[] = [];

  for (const [key, value] of Object.entries(document)) {
    if (key === '_id') continue;
    if (value !== null && typeof value === 'object') continue;
    fields.push({ key, value });
    if (fields.length >= maxFields) break;
  }

  return fields;
}
