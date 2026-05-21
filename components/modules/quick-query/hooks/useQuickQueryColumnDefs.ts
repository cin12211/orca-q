import { computed, type Ref } from 'vue';
import type {
  ColDef,
  ICellEditorParams,
  ValueFormatterParams,
  ValueSetterParams,
} from 'ag-grid-community';
import {
  DEFAULT_HASH_INDEX_WIDTH,
  HASH_INDEX_HEADER,
  HASH_INDEX_ID,
} from '~/components/base/dynamic-table/constants';
import type { OrderBy } from '~/core/composables/useTableQueryBuilder';
import { formatCellValue, setCellValue } from '~/core/helpers/cell-value';
import { isStructuredColumnType } from '~/core/helpers/sql-column-type';
import type { SchemaForeignKeyMetadata as ForeignKeyMetadata } from '~/core/types';
import CustomCellUuid from '../quick-query-table/CustomCellUuid.vue';
import { type QuickQueryColumnType } from '../utils/quickQueryTable';

type RelationModalPayload = {
  id: string;
  tableName: string;
  columnName: string;
  schemaName: string;
};

interface UseQuickQueryColumnDefsOptions {
  columnTypes: Ref<QuickQueryColumnType[]>;
  primaryKeyColumns: Ref<string[]>;
  foreignKeyColumns: Ref<string[]>;
  foreignKeys: Ref<ForeignKeyMetadata[]>;
  orderBy: Ref<OrderBy>;
  isViewOnly: Ref<boolean | undefined>;
  currentTableName: Ref<string>;
  currentSchemaName: Ref<string>;
  isHaveRelationByFieldName: (columnName: string) => boolean | undefined;
  onUpdateOrderBy: (value: OrderBy) => void;
  onOpenBackReferencedTableModal: (value: RelationModalPayload) => void;
  onOpenForwardReferencedTableModal: (value: RelationModalPayload) => void;
}

export const useQuickQueryColumnDefs = ({
  columnTypes,
  primaryKeyColumns,
  foreignKeyColumns,
  foreignKeys,
  orderBy,
  isViewOnly,
  currentTableName,
  currentSchemaName,
  isHaveRelationByFieldName,
  onUpdateOrderBy,
  onOpenBackReferencedTableModal,
  onOpenForwardReferencedTableModal,
}: UseQuickQueryColumnDefsOptions) => {
  const columnDefs = computed<ColDef[]>(() => {
    if (!columnTypes.value?.length) {
      return [];
    }

    const columns: ColDef[] = [
      {
        colId: HASH_INDEX_ID,
        headerName: HASH_INDEX_HEADER,
        field: HASH_INDEX_ID,
        filter: false,
        resizable: true,
        editable: false,
        sortable: false,
        type: 'indexColumn',
        headerComponentParams: {
          allowSorting: false,
        },
        pinned: 'left',
        width: DEFAULT_HASH_INDEX_WIDTH,
      },
    ];

    const setPrimaryKeys = new Set(primaryKeyColumns.value);
    const setForeignKeyColumns = new Set(foreignKeyColumns.value);
    const mapForeignKeys = new Map(
      foreignKeys.value.map(foreignKey => [foreignKey.column, foreignKey])
    );

    columnTypes.value.forEach(({ name, type }) => {
      const fieldId = name;
      const sort =
        orderBy.value.columnName === fieldId ? orderBy.value.order : undefined;
      const isPrimaryKey = setPrimaryKeys.has(fieldId);
      const isForeignKey = setForeignKeyColumns.has(fieldId);
      const foreignKey = mapForeignKeys.get(fieldId);
      const haveRelationByFieldName = isHaveRelationByFieldName(fieldId);
      const isShowCustomCellUuid =
        (isPrimaryKey && haveRelationByFieldName) ||
        (isForeignKey && foreignKey);
      const isStructuredColumn = isStructuredColumnType(type);

      columns.push({
        headerName: fieldId,
        field: fieldId,
        colId: fieldId,
        filter: false,
        resizable: true,
        editable: true,
        sortable: false,
        type: 'editableColumn',
        headerComponentParams: {
          allowSorting: true,
          sort,
          onUpdateSort: onUpdateOrderBy,
          fieldId,
          isPrimaryKey,
          isForeignKey,
        },
        cellRenderer: isShowCustomCellUuid ? CustomCellUuid : undefined,
        cellRendererParams: {
          isPrimaryKey: isShowCustomCellUuid,
          onOpenPreviewReverseTableModal: (id: string) => {
            if (isForeignKey && foreignKey) {
              onOpenForwardReferencedTableModal({
                id,
                tableName: foreignKey.referenced_table,
                columnName: foreignKey.referenced_column,
                schemaName: foreignKey.referenced_table_schema,
              });
              return;
            }

            onOpenBackReferencedTableModal({
              id,
              columnName: fieldId,
              tableName: currentTableName.value,
              schemaName: currentSchemaName.value,
            });
          },
        },
        cellEditorSelector: (_params: ICellEditorParams) => {
          if (isStructuredColumn) {
            return {
              component: 'AgJsonCellEditor',
              popup: true,
              popupPosition: 'under',
            };
          }
        },
        valueFormatter: (params: ValueFormatterParams) =>
          formatCellValue(params, isStructuredColumn),
        valueSetter: (params: ValueSetterParams) =>
          setCellValue({
            params,
            fieldId,
            isObjectColumn: isStructuredColumn,
            isViewOnly: isViewOnly.value,
          }),
      });
    });

    return columns;
  });

  return {
    columnDefs,
  };
};
