import type { DatabaseField } from '#shared/types';

/** Field metadata for drivers that only report column names. */
export function createSyntheticFields(columnNames: string[]): DatabaseField[] {
  return columnNames.map((name, index) => ({
    name,
    tableID: 0,
    columnID: index,
    dataTypeID: 0,
    dataTypeSize: 0,
    dataTypeModifier: 0,
    format: 'text',
  }));
}

/** Turns array-mode rows into `{ column: value }` objects. */
export function mapArrayRowsToObjects(
  rows: unknown[][],
  fields: Pick<DatabaseField, 'name'>[]
): Record<string, unknown>[] {
  return rows.map(row =>
    Object.fromEntries(fields.map((field, index) => [field.name, row[index]]))
  );
}

/**
 * Oracle folds unquoted aliases to upper case; catalog code reads them in
 * lower case. Not for user queries, whose column names must stay intact.
 */
export function lowerCaseRowKeys<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map(
    row =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key.toLowerCase(), value])
      ) as T
  );
}
