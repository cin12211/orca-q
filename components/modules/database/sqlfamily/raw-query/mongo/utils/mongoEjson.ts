import { EJSON } from 'bson';
import { formatMongoDisplayJson } from '~/components/modules/quick-query/mongodb/utils/mongoEjsonUtils';

export function parseMongoEjsonVariables(
  source: string
): Record<string, unknown> {
  const value = EJSON.parse(source || '{}', { relaxed: false });
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Mongo variables must be an Extended JSON object');
  }
  return value as Record<string, unknown>;
}

export function serializeMongoEjson(value: unknown): unknown {
  return EJSON.serialize(value, { relaxed: false });
}

export function formatMongoEjsonConsoleValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined) return 'undefined';
  if (typeof value === 'bigint') return `${value}n`;

  try {
    return formatMongoDisplayJson(serializeMongoEjson(value), 0);
  } catch {
    return String(value);
  }
}
