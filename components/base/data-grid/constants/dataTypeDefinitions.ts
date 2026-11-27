import type { DataTypeDefinition } from 'ag-grid-community';
import { passThroughCellValueParser } from '~/core/helpers/cell-value';

/**
 * Overrides for AG Grid's built-in cell data types, shared by every grid.
 *
 * AG Grid infers `cellDataType: 'object'` for a column whose first value is an
 * object, and its default parser for that type is `() => null`. Any edit that
 * goes through a parser (text editor blur, paste, fill) then blanks
 * object-valued cells such as BLOB/BYTEA Buffers or driver-decoded arrays.
 * Passing the input through lets each column's `valueSetter` own parsing.
 */
export const BASE_DATA_GRID_DATA_TYPE_DEFINITIONS: Record<
  string,
  DataTypeDefinition
> = {
  object: {
    baseDataType: 'object',
    extendsDataType: 'object',
    valueParser: passThroughCellValueParser,
  },
};
