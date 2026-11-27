import type { CellEditorSelectorResult } from 'ag-grid-community';
import { isSerializedBinaryValue } from '~/core/helpers/binary-value';

/** Registered by `BaseDataGrid` (`components.AgJsonCellEditor`). */
export const JSON_CELL_EDITOR = 'AgJsonCellEditor';

/** Registered by `BaseDataGrid` (`components.AgTextCellEditor`). */
export const TEXT_POPUP_CELL_EDITOR = 'AgTextCellEditor';

/**
 * `agLargeTextCellEditor` defaults to `maxLength: 200` and silently cuts
 * longer text. Use the largest value a textarea `maxlength` accepts.
 */
const MAX_TEXT_EDITOR_LENGTH = 2_147_483_647;

const LINE_BREAK = /[\r\n]/;

/**
 * Pick a cell editor from the cell's own value rather than the column type
 * AG Grid inferred from the first row. Every branch is an editor whose
 * untouched output maps back to the original value:
 *
 * - binary   → `AgTextCellEditor` popup with the `0x…` hex (the cell itself
 *   only shows `BINARY - n bytes`; JSON would expose the Buffer shape)
 * - JSON     → JSON popup (cancelled unless confirmed)
 * - boolean  → checkbox (returns the same boolean)
 * - multi-line text → textarea (a single-line input would drop line breaks)
 * - anything else → plain text input with the raw value; `setCellValue`
 *   restores numbers/booleans from the text
 *
 * Always returning an editor also keeps AG Grid's inferred number/date
 * editors away from rows whose value does not match the inferred type.
 */
export const selectSafeCellEditor = ({
  value,
  isJsonCell,
  isBinaryColumn = false,
}: {
  value: unknown;
  isJsonCell: boolean;
  /**
   * Declared binary column. Lets NULL / new-row cells, which have no Buffer
   * value, still open the binary editor instead of a plain text input.
   */
  isBinaryColumn?: boolean;
}): CellEditorSelectorResult => {
  const isEmpty = value === null || value === undefined;

  if (isSerializedBinaryValue(value) || (isBinaryColumn && isEmpty)) {
    return {
      component: TEXT_POPUP_CELL_EDITOR,
      popup: true,
      popupPosition: 'under',
      params: { valueKind: 'binary' },
    };
  }

  if (isJsonCell) {
    return {
      component: JSON_CELL_EDITOR,
      popup: true,
      popupPosition: 'under',
    };
  }

  if (typeof value === 'boolean') {
    return { component: 'agCheckboxCellEditor' };
  }

  if (typeof value === 'string' && LINE_BREAK.test(value)) {
    return {
      component: 'agLargeTextCellEditor',
      popup: true,
      params: { maxLength: MAX_TEXT_EDITOR_LENGTH, useFormatter: false },
    };
  }

  return { component: 'agTextCellEditor', params: { useFormatter: false } };
};
