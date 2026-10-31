import type { DatabaseField } from '~/core/types';

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
