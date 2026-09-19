import type { FieldDef } from 'pg';
import type { RowData } from '~/components/base/data-grid/utils';

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function normalizeResultRow(
  row: RowData,
  columns: {
    name?: string;
    originalName?: string;
    queryFieldName?: string;
    aliasFieldName?: string;
  }[]
): Record<string, unknown> {
  const getFieldKey = (col: {
    name?: string;
    originalName?: string;
    queryFieldName?: string;
    aliasFieldName?: string;
  }) =>
    col.aliasFieldName ||
    col.name ||
    col.originalName ||
    col.queryFieldName ||
    '';

  const getColName = (col: {
    name?: string;
    originalName?: string;
    queryFieldName?: string;
    aliasFieldName?: string;
  }) => col.name || col.originalName || col.queryFieldName || '';

  if (Array.isArray(row)) {
    return Object.fromEntries(
      columns.map((col, index) => [getFieldKey(col), row[index]])
    );
  }

  const record = row as Record<string, unknown>;

  if (!columns.length) {
    return { ...record };
  }

  const normalized: Record<string, unknown> = {};
  let hasMappedValue = false;

  columns.forEach((col, index) => {
    const fieldKey = getFieldKey(col);
    const colName = getColName(col);
    if (hasOwn(record, colName)) {
      normalized[fieldKey] = record[colName];
      hasMappedValue = true;
      return;
    }

    const indexKey = String(index);
    if (hasOwn(record, indexKey)) {
      normalized[fieldKey] = record[indexKey];
      hasMappedValue = true;
    }
  });

  return hasMappedValue ? normalized : { ...record };
}

export function normalizeResultRows(
  rows: RowData[],
  columns: {
    name?: string;
    originalName?: string;
    queryFieldName?: string;
    aliasFieldName?: string;
  }[]
): Record<string, unknown>[] {
  return (rows || []).map(row => normalizeResultRow(row, columns));
}
