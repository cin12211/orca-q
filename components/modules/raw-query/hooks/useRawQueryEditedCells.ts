import { computed, ref, type Ref } from 'vue';
import type { CellValueChangedEvent } from 'ag-grid-community';
import { normalizeEditedCellChange } from '~/core/helpers/cell-value';
import { isStructuredColumnType } from '~/core/helpers/sql-column-type';
import type { MappedRawColumn } from '../interfaces';
import type { RawQueryEditedCell } from '../utils/buildRawQueryUpdates';

interface UseRawQueryEditedCellsOptions {
  columns: Ref<MappedRawColumn[]>;
  /** Snapshot of the original rows. Used to detect "back to original" edits. */
  originalRows: Ref<Record<string, unknown>[]>;
}

/**
 * Tracks user edits on a raw-query result grid. Unlike `useQuickQueryEditedCells`
 * we have no insert/delete flow — only UPDATEs against existing rows. Edits
 * that revert a cell back to its original value are automatically dropped.
 */
export const useRawQueryEditedCells = ({
  columns,
  originalRows,
}: UseRawQueryEditedCellsOptions) => {
  const editedCells = ref<RawQueryEditedCell[]>([]);

  const columnsByField = computed(
    () => new Map(columns.value.map(column => [column.originalName, column]))
  );

  const resolveFieldType = (fieldId: string): string =>
    columnsByField.value.get(fieldId)?.short_type_name ||
    columnsByField.value.get(fieldId)?.type ||
    '';

  const onCellValueChanged = (event: CellValueChangedEvent) => {
    const { colDef, newValue, node } = event;
    const fieldId = colDef.field;
    const rowId = node.rowIndex;

    if (!fieldId || rowId === null || rowId === undefined) return;

    const column = columnsByField.value.get(fieldId);
    if (!column) return;

    const fieldType = resolveFieldType(fieldId);
    const isObjectColumn = isStructuredColumnType(fieldType);
    const originalValue = originalRows.value[rowId]?.[fieldId];
    const { hasChanged, normalizedValue } = normalizeEditedCellChange({
      fieldType,
      isObjectColumn,
      oldValue: originalValue,
      newValue,
    });

    const existingIndex = editedCells.value.findIndex(
      cell => cell.rowId === rowId && cell.fieldId === fieldId
    );

    if (!hasChanged) {
      if (existingIndex >= 0) {
        editedCells.value = editedCells.value.filter(
          (_, idx) => idx !== existingIndex
        );
      }
      return;
    }

    if (existingIndex >= 0) {
      const next = editedCells.value.slice();
      next[existingIndex] = { rowId, fieldId, newValue: normalizedValue };
      editedCells.value = next;
      return;
    }

    editedCells.value = [
      ...editedCells.value,
      { rowId, fieldId, newValue: normalizedValue },
    ];
  };

  const clearEditedCells = () => {
    editedCells.value = [];
  };

  const hasEditedCells = computed(() => editedCells.value.length > 0);

  return {
    editedCells,
    hasEditedCells,
    onCellValueChanged,
    clearEditedCells,
  };
};
