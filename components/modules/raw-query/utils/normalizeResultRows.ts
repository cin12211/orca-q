import type { FieldDef } from 'pg';
import type { RowData } from '~/components/base/dynamic-table/utils';

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function normalizeResultRow(
  row: RowData,
  fieldDefs: Pick<FieldDef, 'name'>[]
): Record<string, unknown> {
  if (Array.isArray(row)) {
    return Object.fromEntries(
      fieldDefs.map((field, index) => [field.name, row[index]])
    );
  }

  const record = row as Record<string, unknown>;

  if (!fieldDefs.length) {
    return { ...record };
  }

  const normalized: Record<string, unknown> = {};
  let hasMappedValue = false;

  fieldDefs.forEach((field, index) => {
    if (hasOwn(record, field.name)) {
      normalized[field.name] = record[field.name];
      hasMappedValue = true;
      return;
    }

    const indexKey = String(index);
    if (hasOwn(record, indexKey)) {
      normalized[field.name] = record[indexKey];
      hasMappedValue = true;
    }
  });

  return hasMappedValue ? normalized : { ...record };
}

export function normalizeResultRows(
  rows: RowData[],
  fieldDefs: Pick<FieldDef, 'name'>[]
): Record<string, unknown>[] {
  return rows.map(row => normalizeResultRow(row, fieldDefs));
}
