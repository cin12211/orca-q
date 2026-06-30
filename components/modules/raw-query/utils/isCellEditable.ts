import type { MappedRawColumn } from '../interfaces';

/**
 * Group columns by their owning table. A column has an "owning table" when
 * both `tableName` and `schemaName` are known — typically the result of a
 * SELECT against a known relation (possibly with JOINs). Columns lacking
 * either field cannot be safely targeted by an UPDATE.
 */
export interface RawQueryEditableTable {
  schemaName: string;
  tableName: string;
  primaryKeyColumns: MappedRawColumn[];
  /** Index in `activeTabColumns` (i.e. ag-grid field key) for each PK. */
  primaryKeyFields: string[];
}

export const groupColumnsByTable = (
  columns: MappedRawColumn[]
): Map<string, RawQueryEditableTable> => {
  const groups = new Map<string, RawQueryEditableTable>();

  for (const column of columns) {
    if (!column.tableName || !column.schemaName) continue;

    const key = `${column.schemaName}.${column.tableName}`;
    let group = groups.get(key);

    if (!group) {
      group = {
        schemaName: column.schemaName,
        tableName: column.tableName,
        primaryKeyColumns: [],
        primaryKeyFields: [],
      };
      groups.set(key, group);
    }

    if (column.isPrimaryKey) {
      group.primaryKeyColumns.push(column);
      group.primaryKeyFields.push(column.aliasFieldName);
    }
  }

  return groups;
};

/**
 * Returns true when a single result-row cell can be safely UPDATEd:
 *
 *  1. The column belongs to a known schema + table.
 *  2. The column itself is NOT a primary key (PKs are row identity — editing
 *     them would change the WHERE clause we use to find the row).
 *  3. The table has at least one primary-key column projected in the result.
 *  4. Every projected PK column has a non-null value in this row, so the
 *     resulting WHERE clause uniquely identifies the row.
 *
 * Returning false should disable editing for that specific cell.
 */
export const isCellEditable = ({
  column,
  row,
  tableGroups,
}: {
  column: MappedRawColumn;
  row: Record<string, unknown> | undefined | null;
  tableGroups: Map<string, RawQueryEditableTable>;
}): boolean => {
  if (!row) return false;
  if (!column.tableName || !column.schemaName) return false;
  if (column.isPrimaryKey) return false;

  const group = tableGroups.get(`${column.schemaName}.${column.tableName}`);
  if (!group || group.primaryKeyFields.length === 0) return false;

  return group.primaryKeyFields.every(field => {
    const value = row[field];
    return value !== null && value !== undefined;
  });
};

/**
 * Cheap whole-column check: is there any possibility of editing this column?
 * Used to decide whether ag-grid's `editable` prop on a column should be a
 * function (per-row check) or a hard `false`.
 */
export const isColumnPotentiallyEditable = ({
  column,
  tableGroups,
}: {
  column: MappedRawColumn;
  tableGroups: Map<string, RawQueryEditableTable>;
}): boolean => {
  if (!column.tableName || !column.schemaName) return false;
  if (column.isPrimaryKey) return false;
  const group = tableGroups.get(`${column.schemaName}.${column.tableName}`);
  return !!group && group.primaryKeyFields.length > 0;
};
