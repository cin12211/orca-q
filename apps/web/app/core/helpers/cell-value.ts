import type {
  ValueFormatterParams,
  ValueSetterParams,
} from 'ag-grid-community';

/**
 * Normalize a cell value after editing.
 * Handles array columns, JSON objects, and booleans.
 */
export function normalizeEditedCellValue({
  fieldType,
  isObjectColumn,
  value,
}: {
  fieldType: string;
  isObjectColumn: boolean;
  value: unknown;
}) {
  const isArrayColumn = fieldType.trim().endsWith('[]');

  if (isArrayColumn) {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      return JSON.parse(value);
    }
  }

  const formattedValue =
    isObjectColumn && typeof value !== 'string' ? JSON.stringify(value) : value;

  if (
    formattedValue === '' ||
    formattedValue === null ||
    formattedValue === undefined
  ) {
    return null;
  }

  if (fieldType === 'bool') {
    if (typeof formattedValue === 'string') {
      const normalized = formattedValue.trim().toLowerCase();

      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
      if (normalized === '1') return true;
      if (normalized === '0') return false;
    }

    if (formattedValue === 1) return true;
    if (formattedValue === 0) return false;

    return formattedValue;
  }

  return formattedValue;
}

/**
 * Deep-compare two cell values, using JSON serialization for objects/arrays.
 */
export const areCellValuesDifferent = ({
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

export const normalizeEditedCellChange = ({
  fieldType,
  isObjectColumn,
  oldValue,
  newValue,
}: {
  fieldType: string;
  isObjectColumn: boolean;
  oldValue: unknown;
  newValue: unknown;
}) => {
  const normalizedValue = normalizeEditedCellValue({
    fieldType,
    isObjectColumn,
    value: newValue,
  });

  return {
    normalizedValue,
    hasChanged: areCellValuesDifferent({
      oldValue,
      newValue: normalizedValue,
      isObjectColumn,
    }),
  };
};

/**
 * Format a cell value for display in the grid.
 */
export const formatCellValue = (
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

/**
 * Set a cell value, parsing JSON for structured columns.
 * Returns `true` if the value was set, `false` if rejected.
 */
export const setCellValue = ({
  params,
  fieldId,
  isObjectColumn,
  isViewOnly,
  emptyAsNull,
}: {
  params: ValueSetterParams;
  fieldId: string;
  isObjectColumn: boolean;
  isViewOnly?: boolean;
  emptyAsNull?: boolean;
}) => {
  if (isViewOnly) {
    return false;
  }

  if (
    emptyAsNull &&
    (params.newValue === '' ||
      params.newValue === null ||
      params.newValue === undefined)
  ) {
    params.data[fieldId] = null;
    return true;
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
