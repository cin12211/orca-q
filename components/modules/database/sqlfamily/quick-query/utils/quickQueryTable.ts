import type { SuppressKeyboardEventParams } from 'ag-grid-community';
import { HASH_INDEX_ID } from '~/components/base/data-grid/constants';
import type { RowData } from '~/components/base/data-grid/utils';

export type QuickQueryEditedCell = {
  rowId: number;
  changedData: Record<string, unknown>;
  isNewRow?: boolean;
};

export type QuickQueryColumnType = {
  name: string;
  type: string;
};

export const buildQuickQueryRowData = (
  data: RowData[] | undefined,
  offset: number
): RowData[] =>
  (data ?? []).map((row, index) => ({
    [HASH_INDEX_ID]: index + offset + 1,
    ...row,
  }));

export function suppressDeleteKeyboardEvent(
  params: SuppressKeyboardEventParams
) {
  const key = params.event.key;
  const deleteKeys = ['Backspace', 'Delete'];

  return deleteKeys.some(
    suppressedKey =>
      suppressedKey === key || key.toUpperCase() === suppressedKey
  );
}
