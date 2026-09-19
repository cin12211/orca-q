import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  buildDeleteStatements,
  buildUpdateStatements,
} from '~/core/helpers/sql-mutation-statements';
import type { MappedRawColumn } from '../interfaces';
import {
  groupColumnsByTable,
  isCellEditable,
  type RawQueryEditableTable,
} from './isCellEditable';

export interface RawQueryEditedCell {
  rowId: number;
  /** ag-grid field id (== `MappedRawColumn.originalName`) */
  fieldId: string;
  newValue: unknown;
}

export interface RawQueryUpdateGroup {
  schemaName: string;
  tableName: string;
  pKeys: string[];
  updates: {
    pKeyValue: Record<string, unknown>;
    update: Record<string, unknown>;
  }[];
  /** Pre-rendered preview SQL — one statement per updated row. */
  sqlStatements: string[];
  /** True if any update fell back to all-columns WHERE because no PK exists. */
  hasNoPkWarning: boolean;
}

export interface BuildRawQueryUpdatesResult {
  groups: RawQueryUpdateGroup[];
  /** Edits dropped because the target cell is not safely editable. */
  skipped: RawQueryEditedCell[];
}

interface BuildRawQueryUpdatesOptions {
  editedCells: RawQueryEditedCell[];
  columns: MappedRawColumn[];
  rows: Record<string, unknown>[];
  dbType?: DatabaseClientType;
}

/**
 * Groups the in-memory `editedCells` by (schema, table) and produces the
 * payloads + preview SQL needed by `/api/tables/bulk-update`. Edits that
 * target non-editable cells are dropped into `skipped` so the UI can warn.
 */
export const buildRawQueryUpdates = ({
  editedCells,
  columns,
  rows,
  dbType,
}: BuildRawQueryUpdatesOptions): BuildRawQueryUpdatesResult => {
  const columnsByField = new Map(columns.map(col => [col.aliasFieldName, col]));
  const tableGroups = groupColumnsByTable(columns);
  const skipped: RawQueryEditedCell[] = [];

  // Intermediate accumulator keyed by `schema.table` then by rowId so multiple
  // edits on the same row collapse into a single UPDATE statement.
  type Accum = {
    table: RawQueryEditableTable;
    rows: Map<number, Record<string, unknown>>;
  };
  const accum = new Map<string, Accum>();

  for (const cell of editedCells) {
    const column = columnsByField.get(cell.fieldId);
    const row = rows[cell.rowId];

    if (!column || !row) {
      skipped.push(cell);
      continue;
    }

    if (!isCellEditable({ column, row, tableGroups })) {
      skipped.push(cell);
      continue;
    }

    const key = `${column.schemaName}.${column.tableName}`;
    const table = tableGroups.get(key);
    if (!table) {
      skipped.push(cell);
      continue;
    }

    let bucket = accum.get(key);
    if (!bucket) {
      bucket = { table, rows: new Map() };
      accum.set(key, bucket);
    }

    let rowUpdate = bucket.rows.get(cell.rowId);
    if (!rowUpdate) {
      rowUpdate = {};
      bucket.rows.set(cell.rowId, rowUpdate);
    }

    rowUpdate[column.sourceColumnName || column.originalName] = cell.newValue;
  }

  const groups: RawQueryUpdateGroup[] = [];

  for (const [, bucket] of accum) {
    const group: RawQueryUpdateGroup = {
      schemaName: bucket.table.schemaName,
      tableName: bucket.table.tableName,
      pKeys: bucket.table.primaryKeyColumns.map(
        c => c.sourceColumnName || c.originalName
      ),
      updates: [],
      sqlStatements: [],
      hasNoPkWarning: false,
    };

    for (const [rowId, update] of bucket.rows) {
      const row = rows[rowId];
      if (!row) continue;

      // Build the WHERE clause input — just the PK fields from the row.
      const pKeyValue: Record<string, unknown> = {};
      for (const pkCol of bucket.table.primaryKeyColumns) {
        pKeyValue[pkCol.sourceColumnName || pkCol.originalName] =
          row[pkCol.aliasFieldName];
      }

      const { sql, noPkWarning } = buildUpdateStatements({
        schemaName: bucket.table.schemaName,
        tableName: bucket.table.tableName,
        pKeys: bucket.table.primaryKeyColumns.map(
          c => c.sourceColumnName || c.originalName
        ),
        pKeyValue,
        update,
        dbType,
      });

      group.updates.push({ pKeyValue, update });
      group.sqlStatements.push(sql);
      if (noPkWarning) group.hasNoPkWarning = true;
    }

    if (group.updates.length) {
      groups.push(group);
    }
  }

  return { groups, skipped };
};

// ---------------------------------------------------------------------------
// DELETE helpers
// ---------------------------------------------------------------------------

export interface RawQueryDeleteGroup {
  schemaName: string;
  tableName: string;
  pKeys: string[];
  /** Full row objects (used as pKeyValue input to the endpoint). */
  pKeyValues: Record<string, unknown>[];
  sqlStatements: string[];
  hasNoPkWarning: boolean;
}

export interface BuildRawQueryDeletesResult {
  groups: RawQueryDeleteGroup[];
}

/**
 * Groups selected rows by (schema, table) and produces the payloads + preview
 * SQL needed by `/api/tables/bulk-delete`. Only rows whose table has at least
 * one PK column in the result set are included; the rest are silently skipped
 * because we can't build a safe WHERE clause for them.
 *
 * For JOIN results a row belongs to EVERY table projected in the columns, so
 * it will appear in multiple groups — one DELETE per table.
 */
export const buildRawQueryDeletes = ({
  selectedRows,
  columns,
  dbType,
}: {
  selectedRows: Record<string, unknown>[];
  columns: MappedRawColumn[];
  dbType?: DatabaseClientType;
}): BuildRawQueryDeletesResult => {
  const tableGroups = groupColumnsByTable(columns);
  const groups: RawQueryDeleteGroup[] = [];

  for (const [, table] of tableGroups) {
    if (!table.primaryKeyFields.length) continue;

    const group: RawQueryDeleteGroup = {
      schemaName: table.schemaName,
      tableName: table.tableName,
      pKeys: table.primaryKeyColumns.map(
        c => c.sourceColumnName || c.originalName
      ),
      pKeyValues: [],
      sqlStatements: [],
      hasNoPkWarning: false,
    };

    for (const row of selectedRows) {
      // Only include rows where all PKs are non-null.
      const allPksPresent = table.primaryKeyColumns.every(pkCol => {
        const val = row[pkCol.aliasFieldName];
        return val !== null && val !== undefined;
      });
      if (!allPksPresent) continue;

      const pKeyValue: Record<string, unknown> = {};
      for (const pkCol of table.primaryKeyColumns) {
        pKeyValue[pkCol.sourceColumnName || pkCol.originalName] =
          row[pkCol.aliasFieldName];
      }

      const { sql, noPkWarning } = buildDeleteStatements({
        schemaName: table.schemaName,
        tableName: table.tableName,
        pKeys: table.primaryKeyColumns.map(
          c => c.sourceColumnName || c.originalName
        ),
        pKeyValue,
        dbType,
      });

      group.pKeyValues.push(pKeyValue);
      group.sqlStatements.push(sql);
      if (noPkWarning) group.hasNoPkWarning = true;
    }

    if (group.pKeyValues.length) {
      groups.push(group);
    }
  }

  return { groups };
};
