/**
 * Column type detection helpers — moved from quick-query/utils to be
 * reusable across modules (raw-query, etc.).
 */

export const isJsonColumnType = (type: string) =>
  ['object', 'json', 'jsonb'].includes(type.trim().toLowerCase());

export const isArrayColumnType = (type: string) => type.trim().endsWith('[]');

export const isStructuredColumnType = (type: string) =>
  isJsonColumnType(type) || isArrayColumnType(type);

/**
 * Declared binary column types across supported databases (Postgres `bytea`,
 * MySQL/MariaDB/SQLite blobs and (var)binary, Oracle raw, MSSQL image).
 */
const BINARY_COLUMN_TYPES = new Set([
  'bytea',
  'blob',
  'tinyblob',
  'mediumblob',
  'longblob',
  'binary',
  'varbinary',
  'raw',
  'long raw',
  'image',
]);

/**
 * True for a binary column, whatever its length / modifiers
 * (`varbinary(16)`, `BLOB`, `varbinary(max)`). Needed for NULL cells, which
 * carry no Buffer value to tell they hold bytes.
 */
export const isBinaryColumnType = (type: string) =>
  BINARY_COLUMN_TYPES.has(
    type
      .trim()
      .toLowerCase()
      .replace(/\s*\(.*\)$/, '')
  );
