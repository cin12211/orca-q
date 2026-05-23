import { DATA_GRID_ROW_METADATA_IDS } from '~/components/base/data-grid/constants';

/**
 * Check whether a column name is a row-metadata column injected by the shared data grid
 * (e.g. `__hash_index__`), not actual DB data.
 */
export const isSqlRowMetadataColumn = (columnName: string) =>
  DATA_GRID_ROW_METADATA_IDS.includes(
    columnName as (typeof DATA_GRID_ROW_METADATA_IDS)[number]
  );

/**
 * Return only the user-data column names from a result row,
 * filtering out internal metadata columns.
 */
export const getSqlDataColumnNames = (row: Record<string, unknown>) =>
  Object.keys(row).filter(key => !isSqlRowMetadataColumn(key));
