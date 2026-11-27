import type {
  ValueFormatterParams,
  ValueSetterParams,
} from 'ag-grid-community';
import {
  formatBinarySummary,
  formatBinaryValue,
  isSerializedBinaryValue,
  parseBinaryInput,
} from './binary-value';
import { isStructuredColumnType } from './sql-column-type';

export { isSerializedBinaryValue } from './binary-value';

/**
 * Cells whose grid text is a placeholder rather than the value itself —
 * `NULL` and the `BINARY - n bytes` summary. Grids render these muted so
 * users do not mistake the label for the stored data.
 */
export const isPlaceholderCellValue = (value: unknown) =>
  value === null || isSerializedBinaryValue(value);

/** True for any non-null object or array cell value (JSON, arrays, Buffers). */
export const isObjectCellValue = (
  value: unknown
): value is Record<string, unknown> | unknown[] =>
  typeof value === 'object' && value !== null;

/**
 * Whether a single cell must go through the JSON path (JSON editor, JSON
 * formatting, JSON parsing on write). Decided per cell, not per column: the
 * declared type wins, but a value that is an object at runtime (binary
 * Buffers, driver-decoded arrays, geometry, interval objects, ...) must be
 * treated as structured too. Otherwise the plain text editor round-trips it
 * through a string and the cell ends up as `[object Object]` or empty.
 */
export const isObjectCell = ({
  fieldType,
  value,
}: {
  fieldType: string;
  value: unknown;
}) => isStructuredColumnType(fieldType) || isObjectCellValue(value);

/**
 * `valueParser` that hands the editor's raw input to the column's
 * `valueSetter` unchanged.
 *
 * AG Grid infers a `cellDataType` from the first row and installs that
 * type's parser on the column: `object` parses every edit to `null`, `number`
 * turns non-numeric text into `null`, `text` turns `''` into `null`. Those
 * run on every edit, paste and fill, even when the user typed nothing, which
 * blanks or rewrites cells. `setCellValue` owns parsing instead, so it can
 * keep the original value and type when nothing changed.
 */
export const passThroughCellValueParser = <TValue>(params: {
  newValue: TValue;
}) => params.newValue;

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

  // Check null before stringifying: JSON.stringify(null) is the string
  // "null", which would write a JSON/text literal instead of SQL NULL.
  if (value === null || value === undefined) {
    return null;
  }

  // Binary stays in its Buffer shape so the SQL dialect can emit a binary
  // literal; stringifying it would store the JSON text in a BLOB column.
  if (isSerializedBinaryValue(value)) {
    return value;
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
  if (
    isObjectColumn ||
    isObjectCellValue(oldValue) ||
    isObjectCellValue(newValue)
  ) {
    return toComparableJson(oldValue) !== toComparableJson(newValue);
  }

  return oldValue !== newValue;
};

/**
 * Canonical JSON text for comparing structured cells. Structured values are
 * stored as objects but normalized edits come back as JSON strings, so a
 * string that parses as JSON is compared by its parsed content — otherwise
 * confirming an unchanged JSON cell would still be reported as an edit.
 */
const toComparableJson = (value: unknown) => {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value));
    } catch {
      return JSON.stringify(value);
    }
  }

  return JSON.stringify(value ?? null);
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

  // Binary shows its size; the hex bytes are only shown in the editor.
  if (isSerializedBinaryValue(value)) {
    return formatBinarySummary(value);
  }

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

/** Returned by `resolveEditedCellValue` when an edit must be refused. */
const REJECTED_EDIT = Symbol('rejected-edit');

const INTEGER_INPUT = /^[-+]?\d+$/;
const NUMBER_INPUT = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;
const LINE_BREAKS = /\r\n?/g;

/**
 * Text editors hand back a string, whatever the original type was. Restore
 * the original JS type when the text maps back to it losslessly, so that an
 * untouched (or re-typed identical) cell keeps its exact value and type:
 * `42` stays the number 42, `true` stays a boolean, and an integer too large
 * for a JS number keeps its exact digits as a string.
 */
export const coerceEditedScalar = (oldValue: unknown, newValue: string) => {
  if (typeof oldValue === 'number') {
    if (newValue === String(oldValue)) return oldValue;

    const trimmed = newValue.trim();
    if (!NUMBER_INPUT.test(trimmed)) return newValue;

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return newValue;
    if (INTEGER_INPUT.test(trimmed) && !Number.isSafeInteger(parsed)) {
      return newValue;
    }

    return parsed;
  }

  if (typeof oldValue === 'boolean') {
    const normalized = newValue.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return newValue;
  }

  // Browser text inputs report CRLF line breaks as LF. Treat that as
  // unchanged so opening a Windows-style text cell does not rewrite it.
  if (
    typeof oldValue === 'string' &&
    oldValue.includes('\r') &&
    newValue === oldValue.replace(LINE_BREAKS, '\n')
  ) {
    return oldValue;
  }

  return newValue;
};

/**
 * Turn whatever an editor, paste, fill or undo produced into the value to
 * store, or `REJECTED_EDIT` when the input cannot be stored safely.
 */
const resolveEditedCellValue = ({
  oldValue,
  newValue,
  isObjectColumn,
  isBinaryColumn,
  emptyAsNull,
  fieldId,
}: {
  oldValue: unknown;
  newValue: unknown;
  isObjectColumn: boolean;
  isBinaryColumn?: boolean;
  emptyAsNull?: boolean;
  fieldId: string;
}): unknown => {
  if (newValue === null || newValue === undefined) return null;
  if (emptyAsNull && newValue === '') return null;
  if (typeof newValue !== 'string') return newValue;

  // A NULL cell of a binary column has no Buffer to recognise it by; its
  // input is still hex bytes, never text to store as-is.
  const isBinaryCell =
    isSerializedBinaryValue(oldValue) ||
    (isBinaryColumn && (oldValue === null || oldValue === undefined));

  if (isBinaryCell) {
    if (
      isSerializedBinaryValue(oldValue) &&
      newValue === formatBinaryValue(oldValue)
    ) {
      return oldValue;
    }
    // A cleared input means NULL, like text cells; `0x` is the empty value.
    if (!newValue.trim()) return null;

    const binary = parseBinaryInput(newValue);
    if (!binary) {
      console.error(`Invalid hex value in binary column ${fieldId}`);
      return REJECTED_EDIT;
    }
    return binary;
  }

  if (isObjectColumn) {
    try {
      return JSON.parse(newValue);
    } catch (error) {
      console.error(`Invalid JSON format in column ${fieldId}:`, error);
      return REJECTED_EDIT;
    }
  }

  return coerceEditedScalar(oldValue, newValue);
};

const isSameCellValue = (oldValue: unknown, newValue: unknown) => {
  if (isObjectCellValue(oldValue) && isObjectCellValue(newValue)) {
    return JSON.stringify(oldValue) === JSON.stringify(newValue);
  }

  return Object.is(oldValue, newValue);
};

/**
 * Set a cell value from an edit, paste, fill or undo.
 *
 * Returns `true` if the value was set, `false` if the edit was rejected or
 * changes nothing. A no-op edit leaves the stored value untouched (same
 * reference, same type) and fires no `cellValueChanged`, so clicking into a
 * cell and out again can never rewrite the user's data.
 */
export const setCellValue = ({
  params,
  fieldId,
  isObjectColumn,
  isBinaryColumn,
  isViewOnly,
  emptyAsNull,
}: {
  params: ValueSetterParams;
  fieldId: string;
  isObjectColumn: boolean;
  /** Declared binary column: NULL cells take hex input too. */
  isBinaryColumn?: boolean;
  isViewOnly?: boolean;
  emptyAsNull?: boolean;
}) => {
  if (isViewOnly) {
    return false;
  }

  const nextValue = resolveEditedCellValue({
    oldValue: params.oldValue,
    newValue: params.newValue,
    isObjectColumn,
    isBinaryColumn,
    emptyAsNull,
    fieldId,
  });

  if (nextValue === REJECTED_EDIT) {
    return false;
  }

  if (isSameCellValue(params.oldValue, nextValue)) {
    return false;
  }

  params.data[fieldId] = nextValue;
  return true;
};
