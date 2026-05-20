/**
 * Column type detection helpers — moved from quick-query/utils to be
 * reusable across modules (raw-query, etc.).
 */

export const isJsonColumnType = (type: string) =>
  ['object', 'json', 'jsonb'].includes(type);

export const isArrayColumnType = (type: string) => type.trim().endsWith('[]');

export const isStructuredColumnType = (type: string) =>
  isJsonColumnType(type) || isArrayColumnType(type);
