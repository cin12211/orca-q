import { computed, ref, type Ref } from 'vue';
import type { CellValueChangedEvent } from 'ag-grid-community';
import { NEW_ROW_FLAG_ID } from '~/components/base/data-grid/constants';
import type { RowData } from '~/components/base/data-grid/utils';
import { normalizeEditedCellChange } from '~/core/helpers/cell-value';
import {
  isJsonColumnType,
  isStructuredColumnType,
} from '~/core/helpers/sql-column-type';
import {
  type QuickQueryColumnType,
  type QuickQueryEditedCell,
} from '../utils/quickQueryTable';

interface UseQuickQueryEditedCellsOptions {
  data: Ref<RowData[] | undefined>;
  columnTypes: Ref<QuickQueryColumnType[]>;
}

export const useQuickQueryEditedCells = ({
  data,
  columnTypes,
}: UseQuickQueryEditedCellsOptions) => {
  const editedCells = ref<QuickQueryEditedCell[]>([]);

  const mapColumnDef = computed(() => {
    return new Map(
      columnTypes.value.map(columnType => [columnType.name, columnType])
    );
  });

  const isJSONColumn = (fieldId: string) => {
    const fieldType = mapColumnDef.value.get(fieldId)?.type || '';

    return isJsonColumnType(fieldType);
  };

  const isStructuredColumn = (fieldId: string) => {
    const fieldType = mapColumnDef.value.get(fieldId)?.type || '';

    return isStructuredColumnType(fieldType);
  };

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    const { colDef, newValue } = event;
    const rowId = event.node.rowIndex;
    const fieldId = colDef.field;

    if (rowId === undefined || rowId === null || !fieldId) {
      return;
    }

    const isObjectColumn = isStructuredColumn(fieldId);
    const fieldType = mapColumnDef.value.get(fieldId)?.type || '';
    const isNewRow = !!event.node.data?.[NEW_ROW_FLAG_ID];
    const oldFieldValue = isNewRow ? undefined : data.value?.[rowId]?.[fieldId];
    const { hasChanged, normalizedValue } = normalizeEditedCellChange({
      fieldType,
      isObjectColumn,
      oldValue: oldFieldValue,
      newValue,
    });
    const haveEditedCellRecord = editedCells.value.some(
      cell => cell.rowId === rowId
    );

    if (hasChanged && !haveEditedCellRecord) {
      editedCells.value.push({
        rowId,
        changedData: {
          [fieldId]: normalizedValue,
        },
        isNewRow,
      });
      return;
    }

    if (hasChanged) {
      editedCells.value = editedCells.value.map(cell => {
        if (cell.rowId === rowId) {
          return {
            ...cell,
            changedData: {
              ...cell.changedData,
              [fieldId]: normalizedValue,
            },
          };
        }

        return cell;
      });
      return;
    }

    editedCells.value = editedCells.value
      .map(cell => {
        if (cell.rowId !== rowId) {
          return cell;
        }

        const newChangedData = {
          ...cell.changedData,
        };

        delete newChangedData[fieldId];

        return {
          ...cell,
          changedData: newChangedData,
        };
      })
      .filter(
        cell => cell.isNewRow || Object.keys(cell.changedData).length > 0
      );
  };

  return {
    editedCells,
    isJSONColumn,
    mapColumnDef,
    onCellValueChanged,
  };
};
