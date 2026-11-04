import type { ValueFormatterParams } from 'ag-grid-community';
import { describe, expect, it, vi } from 'vitest';
import {
  buildRawQueryColumnDefs,
  type RawQueryDirtyTracker,
} from '~/components/modules/raw-query/utils/buildRawQueryColumnDefs';
import type { MappedRawColumn } from '~/core/types/mapped-column.types';

const col = (overrides: Partial<MappedRawColumn> = {}): MappedRawColumn => {
  const originalName = overrides.originalName || 'col';
  return {
    isPrimaryKey: false,
    isForeignKey: false,
    queryFieldName: originalName,
    originalName,
    aliasFieldName: originalName,
    tableName: 'users',
    schemaName: 'public',
    ...overrides,
  };
};

const buildDefs = (columns: MappedRawColumn[]) => {
  const dirtyTracker: RawQueryDirtyTracker = { cells: [] };

  return buildRawQueryColumnDefs({
    columns,
    rows: [],
    reservedTables: [],
    isEditingEnabled: false,
    dirtyTracker,
    onOpenRelationPreview: vi.fn(),
  });
};

const formatValue = (
  columns: MappedRawColumn[],
  field: string,
  value: unknown
) => {
  const defs = buildDefs(columns);
  const colDef = defs.find(d => d.field === field);
  const formatter = colDef?.valueFormatter;

  if (typeof formatter !== 'function') {
    throw new Error(`No valueFormatter found for field "${field}"`);
  }

  return formatter({ value } as ValueFormatterParams);
};

describe('buildRawQueryColumnDefs - JSON display formatting', () => {
  it('pretty-prints a jsonb column whose value arrives as an already-stringified string', () => {
    const columns = [col({ originalName: 'data', short_type_name: 'jsonb' })];
    const rawStringValue = '{"a":1,"b":{"c":2}}';

    const result = formatValue(columns, 'data', rawStringValue);

    expect(result).toBe(JSON.stringify(JSON.parse(rawStringValue), null, 2));
    // Must not be raw/escaped passthrough of the original string.
    expect(result).not.toBe(rawStringValue);
  });

  it('pretty-prints a json column whose value arrives as an already-stringified string', () => {
    const columns = [col({ originalName: 'meta', type: 'json' })];
    const rawStringValue = '{"foo":"bar"}';

    const result = formatValue(columns, 'meta', rawStringValue);

    expect(result).toBe(JSON.stringify(JSON.parse(rawStringValue), null, 2));
  });

  it('still pretty-prints when the driver already returns a parsed object', () => {
    const columns = [col({ originalName: 'data', short_type_name: 'jsonb' })];
    const value = { a: 1 };

    const result = formatValue(columns, 'data', value);

    expect(result).toBe(JSON.stringify(value, null, 2));
  });

  it('falls back to raw text for a JSON-typed column holding invalid JSON', () => {
    const columns = [col({ originalName: 'data', short_type_name: 'jsonb' })];
    const invalidValue = 'not valid json';

    const result = formatValue(columns, 'data', invalidValue);

    expect(result).toBe(invalidValue);
  });

  it('leaves a plain text column value untouched', () => {
    const columns = [col({ originalName: 'name', short_type_name: 'text' })];
    const value = 'Alice';

    const result = formatValue(columns, 'name', value);

    expect(result).toBe('Alice');
  });

  it('renders NULL for a null value regardless of column type', () => {
    const columns = [col({ originalName: 'data', short_type_name: 'jsonb' })];

    const result = formatValue(columns, 'data', null);

    expect(result).toBe('NULL');
  });
});

describe('buildRawQueryColumnDefs - read-only JSON preview', () => {
  const fnColumn = col({
    originalName: 'report',
    tableName: '',
    schemaName: undefined,
  });

  const getColDef = (columns: MappedRawColumn[], field: string) => {
    const colDef = buildDefs(columns).find(d => d.field === field);
    if (!colDef) throw new Error(`No colDef for "${field}"`);
    return colDef;
  };

  const isEditable = (colDef: ReturnType<typeof getColDef>, row: object) =>
    typeof colDef.editable === 'function'
      ? colDef.editable({ data: row } as never)
      : colDef.editable;

  it('keeps a function-derived cell holding an object editable so the JSON popup can open', () => {
    const colDef = getColDef([fnColumn], 'report');

    expect(isEditable(colDef, { report: { a: 1 } })).toBe(true);
  });

  it('keeps a declared json column editable even when the value is a string', () => {
    const colDef = getColDef(
      [{ ...fnColumn, short_type_name: 'jsonb' }],
      'report'
    );

    expect(isEditable(colDef, { report: '{"a":1}' })).toBe(true);
  });

  it('keeps non-JSON read-only cells non-editable', () => {
    const colDef = getColDef([fnColumn], 'report');

    expect(isEditable(colDef, { report: 'plain text' })).toBe(false);
  });

  it('rejects writes on a read-only JSON cell', () => {
    const colDef = getColDef([fnColumn], 'report');
    const data = { report: { a: 1 } };
    const setter = colDef.valueSetter as (p: unknown) => boolean;

    expect(setter({ data, newValue: '{"a":2}' })).toBe(false);
    expect(data.report).toEqual({ a: 1 });
  });
});
