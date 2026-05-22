import type { ReservedTableSchemas } from '~/core/types/database-tables.types';
import type { MappedRawColumn } from '../interfaces';

/**
 * Returns true if `column` is referenced from another table (i.e. is the target
 * of a foreign key). Detected by scanning `used_by` on the matching reserved table.
 */
export const hasBackReference = (
  column: MappedRawColumn,
  reservedTables: ReservedTableSchemas[]
): boolean => {
  if (!column.tableName || !column.schemaName) {
    return false;
  }

  const sourceColumnName = column.sourceColumnName || column.originalName;

  return reservedTables.some(
    table =>
      table.schema === column.schemaName &&
      table.table === column.tableName &&
      table.used_by?.some(
        usedBy => usedBy.referenced_column === sourceColumnName
      )
  );
};

/**
 * A column is "relation-capable" when it can be used to navigate to another
 * record — either via an outgoing FK or via incoming back-references.
 */
export const isRelationColumn = (
  column: MappedRawColumn,
  reservedTables: ReservedTableSchemas[]
): boolean => {
  if (!column.tableName || !column.schemaName) {
    return false;
  }

  if (column.isForeignKey && column.foreignKey) {
    return true;
  }

  return hasBackReference(column, reservedTables);
};
