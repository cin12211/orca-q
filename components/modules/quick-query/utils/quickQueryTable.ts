import type {
  SuppressKeyboardEventParams,
  ValueFormatterParams,
  ValueSetterParams,
} from 'ag-grid-community';
import { HASH_INDEX_ID } from '~/components/base/dynamic-table/constants';
import type { RowData } from '~/components/base/dynamic-table/utils';
import {
  areCellValuesDifferent,
  formatCellValue,
  setCellValue,
} from '~/core/helpers/cell-value';
import {
  isArrayColumnType,
  isJsonColumnType,
  isStructuredColumnType,
} from '~/core/helpers/sql-column-type';

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

/** @deprecated Use `isJsonColumnType` from `~/core/helpers/sql-column-type` */
export const isQuickQueryJsonColumnType = isJsonColumnType;

/** @deprecated Use `isArrayColumnType` from `~/core/helpers/sql-column-type` */
export const isQuickQueryArrayColumnType = isArrayColumnType;

/** @deprecated Use `isStructuredColumnType` from `~/core/helpers/sql-column-type` */
export const isQuickQueryStructuredColumnType = isStructuredColumnType;

/** @deprecated Use `areCellValuesDifferent` from `~/core/helpers/cell-value` */
export const areQuickQueryCellValuesDifferent = areCellValuesDifferent;

/** @deprecated Use `formatCellValue` from `~/core/helpers/cell-value` */
export const formatQuickQueryCellValue = formatCellValue;

/** @deprecated Use `setCellValue` from `~/core/helpers/cell-value` */
export const setQuickQueryCellValue = ({
  params,
  fieldId,
  isObjectColumn,
  isViewOnly,
}: {
  params: ValueSetterParams;
  fieldId: string;
  isObjectColumn: boolean;
  isViewOnly?: boolean;
}) => setCellValue({ params, fieldId, isObjectColumn, isViewOnly });

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
