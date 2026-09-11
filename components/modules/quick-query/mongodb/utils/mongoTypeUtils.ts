import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { NodeDataType } from 'vue-json-pretty/types/components/TreeNode';
import {
  isMongoDisplayLiteral,
  unwrapMongoDisplayLiteral,
} from './mongoEjsonUtils';

dayjs.extend(utc);

/**
 * Known MongoDB literal prefixes and their display type names
 */
const BSON_LITERAL_KIND_MAP: Record<string, string> = {
  ObjectId: 'ObjectId',
  ISODate: 'Date',
  Int32: 'Int32',
  Long: 'Long',
  Double: 'Double',
  Decimal128: 'Decimal128',
  UUID: 'UUID',
  BinData: 'Binary',
  Timestamp: 'Timestamp',
  RegExp: 'RegExp',
  Code: 'Code',
  DBRef: 'DBRef',
  MinKey: 'MinKey',
  MaxKey: 'MaxKey',
};

const BSON_LITERAL_REGEX =
  /^(ObjectId|ISODate|Int32|Long|Double|Decimal128|UUID|BinData|Timestamp|RegExp|Code|DBRef|MinKey|MaxKey)\(/;

/**
 * Resolves the MongoDB BSON/JSON data type name for a VueJsonPretty tree node.
 * Returns null for closing brackets or root level document braces.
 */
export function getMongoNodeType(
  node: Pick<NodeDataType, 'type' | 'content' | 'level' | 'key' | 'index'>
): string | null {
  // 1. Closing brackets do not have a type
  if (node.type === 'objectEnd' || node.type === 'arrayEnd') {
    return null;
  }

  // 2. Root document container (level 0 without key or index) does not show a key type
  if (node.level === 0 && node.key === undefined && node.index === undefined) {
    return null;
  }

  // 3. Mongo display literals prefixed with __orcaq_bson_literal__
  if (isMongoDisplayLiteral(node.content)) {
    const rawLiteral = unwrapMongoDisplayLiteral(node.content);
    const match = rawLiteral.match(/^([A-Za-z0-9_]+)\(/);
    if (match) {
      const kind = match[1];
      return BSON_LITERAL_KIND_MAP[kind] ?? kind;
    }
  }

  // 4. String values matching BSON literal syntax
  if (typeof node.content === 'string') {
    const match = node.content.match(BSON_LITERAL_REGEX);
    if (match) {
      const kind = match[1];
      return BSON_LITERAL_KIND_MAP[kind] ?? kind;
    }
  }

  // 5. Structural types (Objects and Arrays)
  if (node.type === 'arrayStart' || node.type === 'arrayCollapsed') {
    return 'Array';
  }

  if (node.type === 'objectStart' || node.type === 'objectCollapsed') {
    return 'Object';
  }

  // 6. Primitive types
  if (node.content === null) {
    return 'Null';
  }

  if (typeof node.content === 'string') {
    return 'String';
  }

  if (typeof node.content === 'number') {
    return 'Number';
  }

  if (typeof node.content === 'boolean') {
    return 'Boolean';
  }

  return null;
}

const ISO_DATE_LITERAL_REGEX = /^ISODate\(\s*(?:['"](.*?)['"]|(\d+))\s*\)$/;

/**
 * Extracts and formats a MongoDB ISODate literal into a human-readable UTC timestamp string.
 *
 * Examples:
 * - "ISODate('2026-08-27T08:04:10.633Z')" -> "2026-08-27 08:04:10.633 UTC"
 * - "ISODate('2026-08-27T08:04:10.000Z')" -> "2026-08-27 08:04:10 UTC"
 * - "__orcaq_bson_literal__:ISODate('2026-08-27T08:04:10.633Z')" -> "2026-08-27 08:04:10.633 UTC"
 * - "ISODate('2026-08-27T15:04:10.633+07:00')" -> "2026-08-27 08:04:10.633 UTC"
 */
export function formatMongoUtcDate(value: unknown): string | null {
  if (!value) return null;

  let raw: string;
  if (isMongoDisplayLiteral(value)) {
    raw = unwrapMongoDisplayLiteral(value);
  } else if (typeof value === 'string') {
    raw = value;
  } else {
    return null;
  }

  const match = raw.match(ISO_DATE_LITERAL_REGEX);
  if (!match) return null;

  const rawDateStr = match[1] ?? match[2];
  if (!rawDateStr) return null;

  const parsedValue = match[2] ? Number(match[2]) : rawDateStr;
  const date = dayjs.utc(parsedValue);
  if (!date.isValid()) return null;

  const msFormat = date.millisecond() > 0 ? '.SSS' : '';
  return date.format(`YYYY-MM-DD HH:mm:ss${msFormat} [UTC]`);
}
