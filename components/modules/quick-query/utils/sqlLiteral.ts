import { DYNAMIC_TABLE_ROW_METADATA_IDS } from '~/components/base/dynamic-table/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';

export const isSqlRowMetadataColumn = (columnName: string) =>
  DYNAMIC_TABLE_ROW_METADATA_IDS.includes(
    columnName as (typeof DYNAMIC_TABLE_ROW_METADATA_IDS)[number]
  );

export const getSqlDataColumnNames = (row: Record<string, unknown>) =>
  Object.keys(row).filter(key => !isSqlRowMetadataColumn(key));

export function toSqlLiteral(
  value: unknown,
  options: { dbType?: DatabaseClientType | string } = {}
): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (Array.isArray(value)) {
    if (options.dbType === DatabaseClientType.POSTGRES) {
      if (!value.length) {
        return "'{}'";
      }

      return `ARRAY[${value.map(item => toSqlLiteral(item, options)).join(', ')}]`;
    }

    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (value instanceof Date) {
    return `'${value.toISOString().replace('T', ' ')}'`;
  }

  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }

  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
}
