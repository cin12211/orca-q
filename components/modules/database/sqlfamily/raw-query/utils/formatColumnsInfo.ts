import type { FieldDef } from 'pg';
import type { Schema } from '~/core/stores';
import type {
  DatabaseField,
  TableDetailMetadata,
  SchemaColumnMetadata as ColumnShortMetadata,
} from '~/core/types';
import type { MappedRawColumn } from '../interfaces';
import { inferFieldMetadataFromStatement } from './inferFieldMetadataFromStatement';
import { findTableInfoByName, type ResolvedTableInfo } from './sqlMetadata';

type RawResultField = FieldDef & Partial<DatabaseField>;

export const formatColumnsInfo = ({
  fieldDefs,
  statementQuery,
  schemas,
  getTableInfoById,
}: {
  fieldDefs: RawResultField[];
  statementQuery?: string;
  schemas: Schema[];
  getTableInfoById: (
    tableId: string,
    schema: Schema
  ) =>
    | {
        tableName: string;
        tableInfo: TableDetailMetadata;
      }
    | undefined;
}): MappedRawColumn[] => {
  const resolvedFieldDefs = inferFieldMetadataFromStatement({
    fieldDefs,
    statementQuery,
    schemas,
  });
  const mapTableInfo = new Map<string, ResolvedTableInfo>();
  const seenFieldNames = new Set<string>();
  const seenAliasNames = new Set<string>();

  return resolvedFieldDefs.map(field => {
    const tableId = `${field.tableID}`;
    const tableCacheKey =
      field.tableID && field.tableID > 0
        ? `id:${tableId}`
        : `name:${field.schemaName || ''}.${field.tableName || ''}`;

    const fieldName = field.name;
    const sourceColumnName = field.sourceColumnName || field.name;

    let resolvedTableInfo = mapTableInfo.get(tableCacheKey);

    const hasDuplicateFieldName = seenFieldNames.has(fieldName);
    seenFieldNames.add(fieldName);

    if (!resolvedTableInfo) {
      if (field.tableName) {
        resolvedTableInfo = findTableInfoByName({
          schemas,
          tableName: field.tableName,
          schemaName: field.schemaName,
        });
      }

      if (!resolvedTableInfo && field.tableID) {
        for (const schema of schemas) {
          const table = getTableInfoById(tableId, schema);

          if (table) {
            resolvedTableInfo = {
              schemaName: schema.name,
              tableName: table.tableName,
              tableInfo: table.tableInfo,
            };
            break;
          }
        }
      }

      if (resolvedTableInfo) {
        mapTableInfo.set(tableCacheKey, resolvedTableInfo);
      }
    }

    const column = (resolvedTableInfo?.tableInfo.columns || []).find(
      column => column.name === sourceColumnName
    ) as ColumnShortMetadata;

    const isPrimaryKey = !!resolvedTableInfo?.tableInfo.primary_keys?.find(
      pk => pk.column === sourceColumnName
    );

    const foreignKey = resolvedTableInfo?.tableInfo.foreign_keys?.find(
      fk => fk.column === sourceColumnName
    );
    const isForeignKey = !!foreignKey;

    let aliasFieldName = hasDuplicateFieldName
      ? `${resolvedTableInfo?.tableName || field.tableName || 'table'}.${field.name}`
      : field.name;

    let uniqueAlias = aliasFieldName;
    let suffix = 1;
    while (seenAliasNames.has(uniqueAlias)) {
      uniqueAlias = `${aliasFieldName}_${suffix}`;
      suffix++;
    }
    seenAliasNames.add(uniqueAlias);
    aliasFieldName = uniqueAlias;

    const columnInfo: MappedRawColumn = {
      tableName: resolvedTableInfo?.tableName || field.tableName || '',
      schemaName: resolvedTableInfo?.schemaName || field.schemaName,
      ...column,
      aliasFieldName,
      queryFieldName: field.name,
      originalName: field.name,
      sourceColumnName,
      canMutate: !!column,
      isPrimaryKey,
      isForeignKey,
      foreignKey,
    };

    return columnInfo;
  });
};
