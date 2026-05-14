import type {
  SuppressKeyboardEventParams,
  ValueFormatterParams,
  ValueSetterParams,
} from 'ag-grid-community';
import { HASH_INDEX_ID } from '~/components/base/dynamic-table/constants';
import type { RowData } from '~/components/base/dynamic-table/utils';

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

export const isQuickQueryJsonColumnType = (type: string) =>
  ['object', 'json', 'jsonb'].includes(type);

export const isQuickQueryArrayColumnType = (type: string) =>
  type.trim().endsWith('[]');

export const isQuickQueryStructuredColumnType = (type: string) =>
  isQuickQueryJsonColumnType(type) || isQuickQueryArrayColumnType(type);

export const areQuickQueryCellValuesDifferent = ({
  oldValue,
  newValue,
  isObjectColumn,
}: {
  oldValue: unknown;
  newValue: unknown;
  isObjectColumn: boolean;
}) => {
  if (isObjectColumn || Array.isArray(oldValue) || Array.isArray(newValue)) {
    return JSON.stringify(oldValue) !== JSON.stringify(newValue);
  }

  return oldValue !== newValue;
};

export const formatQuickQueryCellValue = (
  params: ValueFormatterParams,
  isObjectColumn: boolean
) => {
  const value = params.value;

  if (typeof value === 'number' || typeof value === 'bigint') {
    return value.toString();
  }

  if (value === null) {
    return 'NULL';
  }

  if (isObjectColumn) {
    return JSON.stringify(value, null, 2);
  }

  return (value ?? '') as string;
};

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
}) => {
  if (isViewOnly) {
    return false;
  }

  if (!isObjectColumn) {
    params.data[fieldId] = params.newValue;
    return true;
  }

  try {
    params.data[fieldId] = JSON.parse(params.newValue);
    return true;
  } catch (error) {
    console.error(`Invalid JSON format in column ${fieldId}:`, error);
    return false;
  }
};

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
