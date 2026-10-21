import type { FieldDef } from 'pg';
import type { RowData } from '~/components/base/data-grid/utils';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const toFieldDefs = (fieldNames: string[]) =>
  fieldNames.map(name => ({ name }) as FieldDef);

/**
 * Redis replies are untyped. Flatten them into grid rows plus column metadata.
 */
export const normalizeRedisResult = (
  value: unknown
): {
  rows: RowData[];
  fields: FieldDef[];
} => {
  if (Array.isArray(value)) {
    if (value.every(item => isPlainObject(item))) {
      const rows = value as RowData[];
      const fieldNames = Array.from(
        new Set(
          rows.flatMap(row => Object.keys(row as Record<string, unknown>))
        )
      );

      return { rows, fields: toFieldDefs(fieldNames) };
    }

    return {
      rows: value.map((item, index) => ({ index, value: item })),
      fields: toFieldDefs(['index', 'value']),
    };
  }

  if (isPlainObject(value)) {
    const rows = [value as RowData];
    return { rows, fields: toFieldDefs(Object.keys(value)) };
  }

  return { rows: [{ value }], fields: toFieldDefs(['value']) };
};
