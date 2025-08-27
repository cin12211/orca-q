import type { FieldDef } from 'pg';
import type {
  ColumnShortMetadata,
  TableDetailMetadata,
} from '~/server/api/get-schema-meta-data';
import type { Schema } from '~/shared/stores';
import type { MappedRawColumn } from '../interfaces';

export const formatColumnsInfo = ({
  fieldDefs,
  activeSchema,
  getTableInfoById,
}: {
  fieldDefs: FieldDef[];
  activeSchema?: Schema;
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
  const mapTableInfo = new Map<string, TableDetailMetadata>();
  const mapTableName = new Map<string, string>();

  return fieldDefs.map(field => {
    const tableId = `${field.tableID}`;

    let tableInfo = mapTableInfo.get(tableId);
    let tableName = mapTableName.get(tableId);

    if (!tableInfo) {
      if (activeSchema) {
        const table = getTableInfoById(tableId, activeSchema);

        tableInfo = table?.tableInfo;
        tableName = table?.tableName;
      }

      if (tableInfo) {
        mapTableInfo.set(tableId, tableInfo);
        mapTableName.set(tableId, tableName as string);
      }
    }

    const column = tableInfo?.columns.find(
      column => column.name === field.name
    ) as ColumnShortMetadata;

    const isPrimaryKey = !!tableInfo?.primary_keys?.find(
      pk => pk.column === field.name
    );

    const isForeignKey = !!tableInfo?.foreign_keys?.find(
      fk => fk.column === field.name
    );

    const columnInfo: MappedRawColumn = {
      tableName: tableName || '',
      ...column,
      queryFieldName: field.name,
      originalName: column?.name || '',
      canMutate: !!column,
      isPrimaryKey,
      isForeignKey,
    };

    return columnInfo;
  });
};
