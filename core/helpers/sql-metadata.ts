import { DYNAMIC_TABLE_ROW_METADATA_IDS } from '~/components/base/dynamic-table/constants';

/**
 * Check whether a column name is a row-metadata column injected by DynamicTable
 * (e.g. `__hash_index__`), not actual DB data.
 */
export const isSqlRowMetadataColumn = (columnName: string) =>
  DYNAMIC_TABLE_ROW_METADATA_IDS.includes(
    columnName as (typeof DYNAMIC_TABLE_ROW_METADATA_IDS)[number]
  );

/**
 * Return only the user-data column names from a result row,
 * filtering out internal metadata columns.
 */
export const getSqlDataColumnNames = (row: Record<string, unknown>) =>
  Object.keys(row).filter(key => !isSqlRowMetadataColumn(key));
