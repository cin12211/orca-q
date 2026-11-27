/**
 * Real AG Grid round-trip for cell editing: open the editor on a cell, leave
 * it without typing (what a click-then-blur does), and check the stored value
 * survives for every data type the SQL grids receive from the drivers.
 *
 * Regression for: editing a BLOB cell and clicking away left the cell empty,
 * because AG Grid inferred `cellDataType: 'object'` and its default parser
 * for that type turns every edit into `null`.
 */
import { ref } from 'vue';
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  type CellValueChangedEvent,
  type ColDef,
  type GridApi,
  type ICellEditorComp,
  type ICellEditorParams,
} from 'ag-grid-community';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { BASE_DATA_GRID_DATA_TYPE_DEFINITIONS } from '~/components/base/data-grid/constants';
import { useQuickQueryColumnDefs } from '~/components/modules/quick-query/hooks/useQuickQueryColumnDefs';
import { useQuickQueryEditedCells } from '~/components/modules/quick-query/hooks/useQuickQueryEditedCells';
import { useRawQueryEditedCells } from '~/components/modules/raw-query/hooks/useRawQueryEditedCells';
import { buildRawQueryColumnDefs } from '~/components/modules/raw-query/utils/buildRawQueryColumnDefs';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  formatBinaryValue,
  isSerializedBinaryValue,
} from '~/core/helpers/binary-value';
import { buildUpdateStatements } from '~/core/helpers/sql-mutation-statements';
import type { MappedRawColumn } from '~/core/types/mapped-column.types';

/**
 * Stand-in for the Vue `AgJsonCellEditor` with the same contract: leaving
 * without pressing "Oke" cancels the edit and keeps the original value.
 */
class JsonEditorStub implements ICellEditorComp {
  private params!: ICellEditorParams;
  private readonly el = document.createElement('div');

  init(params: ICellEditorParams) {
    this.params = params;
  }
  getGui() {
    return this.el;
  }
  getValue() {
    return this.params.value;
  }
  isPopup() {
    return true;
  }
  isCancelAfterEnd() {
    return true;
  }
}

/**
 * Stand-in for the Vue `AgTextCellEditor` (covered by its own test): shows
 * the cell's hex in a textarea; text typed into it counts as confirmed
 * ("Oke"), leaving it untouched cancels.
 */
class TextPopupEditorStub implements ICellEditorComp {
  private params!: ICellEditorParams;
  private initialText = '';
  private readonly el = document.createElement('div');
  private readonly textarea = document.createElement('textarea');

  init(params: ICellEditorParams) {
    this.params = params;
    this.initialText = isSerializedBinaryValue(params.value)
      ? formatBinaryValue(params.value)
      : String(params.value ?? '');
    this.textarea.value = this.initialText;
    this.el.appendChild(this.textarea);
  }
  getGui() {
    return this.el;
  }
  getValue() {
    return this.isCancelAfterEnd() ? this.params.value : this.textarea.value;
  }
  isPopup() {
    return true;
  }
  isCancelAfterEnd() {
    return this.textarea.value === this.initialText;
  }
}

interface CellCase {
  name: string;
  type: string;
  value: unknown;
}

const LONG_MULTILINE_TEXT = `${'x'.repeat(500)}\n${'y'.repeat(500)}`;

/** Values exactly as they arrive in the browser after JSON transport. */
const CELL_CASES: CellCase[] = [
  { name: 'id', type: 'int4', value: 1 },
  {
    name: 'blob_col',
    type: 'blob',
    value: { type: 'Buffer', data: [1, 2, 3] },
  },
  {
    name: 'bytea_col',
    type: 'bytea',
    value: { type: 'Buffer', data: [222, 173, 190, 239] },
  },
  {
    name: 'empty_blob_col',
    type: 'varbinary',
    value: { type: 'Buffer', data: [] },
  },
  { name: 'text_col', type: 'text', value: 'hello' },
  { name: 'varchar_col', type: 'varchar', value: '' },
  { name: 'padded_text_col', type: 'text', value: '  padded  ' },
  { name: 'multiline_col', type: 'text', value: 'line 1\nline 2\n' },
  { name: 'crlf_col', type: 'text', value: 'line 1\r\nline 2' },
  { name: 'long_text_col', type: 'text', value: LONG_MULTILINE_TEXT },
  { name: 'unicode_col', type: 'text', value: 'Xin chào 👋 — ok' },
  { name: 'int_col', type: 'int4', value: 42 },
  { name: 'zero_col', type: 'int4', value: 0 },
  { name: 'negative_col', type: 'int4', value: -7 },
  { name: 'float_col', type: 'float8', value: 3.14 },
  { name: 'tiny_float_col', type: 'float8', value: 1e-7 },
  { name: 'bigint_col', type: 'int8', value: '9007199254740993' },
  { name: 'numeric_col', type: 'numeric', value: '12.50' },
  { name: 'mysql_tinyint_bool_col', type: 'tinyint', value: 1 },
  { name: 'bool_true_col', type: 'bool', value: true },
  { name: 'bool_false_col', type: 'bool', value: false },
  { name: 'date_col', type: 'date', value: '2024-01-15' },
  {
    name: 'timestamp_col',
    type: 'timestamp',
    value: '2024-01-15T10:20:30.000Z',
  },
  {
    name: 'timestamptz_col',
    type: 'timestamptz',
    value: '2024-01-15 10:20:30+07',
  },
  { name: 'time_col', type: 'time', value: '10:20:30' },
  {
    name: 'uuid_col',
    type: 'uuid',
    value: '3f1c0b8e-1a2b-4c3d-8e9f-001122334455',
  },
  { name: 'enum_col', type: 'user_status', value: 'active' },
  { name: 'json_col', type: 'json', value: { a: 1, nested: { b: [1, 2] } } },
  { name: 'jsonb_col', type: 'jsonb', value: [{ a: 1 }] },
  { name: 'json_string_col', type: 'json', value: '{"a":1}' },
  { name: 'array_col', type: 'text[]', value: ['java', 'spring'] },
  { name: 'pg_array_col', type: '_int4', value: [1, 2, 3] },
  { name: 'point_col', type: 'point', value: { x: 1, y: 2 } },
  { name: 'interval_col', type: 'interval', value: { hours: 1, minutes: 30 } },
  { name: 'null_text_col', type: 'text', value: null },
  { name: 'null_int_col', type: 'int4', value: null },
  { name: 'null_bool_col', type: 'bool', value: null },
  { name: 'null_blob_col', type: 'blob', value: null },
  { name: 'null_json_col', type: 'jsonb', value: null },
];

const EDITABLE_CASES = CELL_CASES.filter(c => c.name !== 'id');

/**
 * Second row whose values do NOT match the type AG Grid infers from row 0
 * (e.g. text in a column inferred as number). Inferred editors/parsers
 * would turn these into NaN / null.
 */
const MISMATCHED_ROW: Record<string, unknown> = {
  id: 2,
  int_col: 'not a number',
  bool_true_col: 'maybe',
  date_col: 'yesterday',
  text_col: 99,
  blob_col: 'legacy text',
  json_col: 'plain text',
};

const buildRow = () =>
  Object.fromEntries(
    CELL_CASES.map(c => [c.name, structuredClone(c.value)])
  ) as Record<string, unknown>;

const buildRows = () => [buildRow(), { ...buildRow(), ...MISMATCHED_ROW }];

let api: GridApi | undefined;
let host: HTMLElement | undefined;

const mountGrid = ({
  columnDefs,
  rowData,
  withDataTypeOverride = true,
  onCellValueChanged,
}: {
  columnDefs: ColDef[];
  rowData: Record<string, unknown>[];
  withDataTypeOverride?: boolean;
  onCellValueChanged?: (event: CellValueChangedEvent) => void;
}) => {
  host = document.createElement('div');
  host.style.width = '2000px';
  host.style.height = '400px';
  document.body.appendChild(host);

  api = createGrid(host, {
    // Vue header/cell renderers need the ag-grid-vue3 wrapper; editing logic
    // lives in the editor/parser/setter callbacks kept here.
    columnDefs: columnDefs.map(
      ({ headerComponentParams: _h, cellRenderer: _r, ...colDef }) => colDef
    ),
    rowData,
    suppressFieldDotNotation: true,
    dataTypeDefinitions: withDataTypeOverride
      ? BASE_DATA_GRID_DATA_TYPE_DEFINITIONS
      : undefined,
    components: {
      AgJsonCellEditor: JsonEditorStub,
      AgTextCellEditor: TextPopupEditorStub,
    },
    onCellValueChanged,
  });

  return api;
};

const startEditing = (gridApi: GridApi, colKey: string, rowIndex = 0) => {
  gridApi.setFocusedCell(rowIndex, colKey);
  gridApi.startEditingCell({ rowIndex, colKey });
  // Guard against a vacuous pass: the cell must really be in edit mode.
  expect(gridApi.getEditingCells()).toHaveLength(1);
};

/**
 * AG Grid dispatches `cellValueChanged` asynchronously, so wait for it before
 * asserting on the dirty-tracking hooks.
 */
const settle = () => new Promise(resolve => setTimeout(resolve, 20));

/** Click into the cell editor and leave it untouched (blur / stop editing). */
const editAndLeave = async (gridApi: GridApi, colKey: string, rowIndex = 0) => {
  startEditing(gridApi, colKey, rowIndex);
  gridApi.stopEditing(false);
  await settle();
};

/** Type into the open text editor and commit, like a user would. */
const typeAndCommit = async (
  gridApi: GridApi,
  colKey: string,
  text: string,
  rowIndex = 0
) => {
  startEditing(gridApi, colKey, rowIndex);
  const [editor] = gridApi.getCellEditorInstances();
  const input = editor
    .getGui()
    .querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  if (!input) throw new Error(`No text input in editor for ${colKey}`);
  input.value = text;
  input.dispatchEvent(new Event('input'));
  gridApi.stopEditing(false);
  await settle();
};

const editorInputValue = (gridApi: GridApi, colKey: string) => {
  startEditing(gridApi, colKey);
  const [editor] = gridApi.getCellEditorInstances();
  const value = editor
    .getGui()
    .querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >('input, textarea')?.value;
  gridApi.stopEditing(true);
  return value;
};

const readCell = (gridApi: GridApi, field: string, rowIndex = 0) =>
  gridApi.getDisplayedRowAtIndex(rowIndex)?.data?.[field];

beforeAll(() => {
  ModuleRegistry.registerModules([AllCommunityModule]);
});

afterEach(() => {
  api?.destroy();
  host?.remove();
  api = undefined;
  host = undefined;
});

describe('AG Grid object data type (root cause)', () => {
  const blob = { type: 'Buffer', data: [1, 2, 3] };
  const plainColumns: ColDef[] = [{ field: 'blob_col', editable: true }];

  it('blanks an object cell on edit without the shared override', async () => {
    const gridApi = mountGrid({
      columnDefs: plainColumns,
      rowData: [{ blob_col: structuredClone(blob) }],
      withDataTypeOverride: false,
    });

    await editAndLeave(gridApi, 'blob_col');

    // Documents the AG Grid default this suite guards against.
    expect(readCell(gridApi, 'blob_col')).toBeNull();
  });

  it('keeps an object cell on edit with BASE_DATA_GRID_DATA_TYPE_DEFINITIONS', async () => {
    const gridApi = mountGrid({
      columnDefs: plainColumns,
      rowData: [{ blob_col: structuredClone(blob) }],
    });

    await editAndLeave(gridApi, 'blob_col');

    expect(readCell(gridApi, 'blob_col')).not.toBeNull();
  });
});

interface GridHarness {
  gridApi: GridApi;
  rows: Record<string, unknown>[];
  editedValue: (rowIndex: number, field: string) => unknown;
  editedCount: () => number;
}

const sharedGridSuite = (label: string, setup: () => GridHarness) => {
  describe(`${label} - click into a cell and out again changes nothing`, () => {
    it.each(EDITABLE_CASES)('$type ($name)', async ({ name }) => {
      const { gridApi, rows, editedCount } = setup();
      const before = rows[0][name];

      await editAndLeave(gridApi, name);

      // Same reference / same primitive: nothing was rewritten.
      expect(readCell(gridApi, name)).toBe(before);
      expect(editedCount()).toBe(0);
    });

    it.each(Object.keys(MISMATCHED_ROW).filter(name => name !== 'id'))(
      'value that does not match the inferred column type (%s)',
      async name => {
        const { gridApi, rows, editedCount } = setup();
        const before = rows[1][name];

        await editAndLeave(gridApi, name, 1);

        expect(readCell(gridApi, name, 1)).toBe(before);
        expect(editedCount()).toBe(0);
      }
    );
  });

  describe(`${label} - real edits keep the right type`, () => {
    it('number cell stays a number', async () => {
      const { gridApi, editedValue } = setup();
      await typeAndCommit(gridApi, 'int_col', '43');
      expect(readCell(gridApi, 'int_col')).toBe(43);
      expect(editedValue(0, 'int_col')).toBe(43);
    });

    it('big integer keeps its exact digits', async () => {
      const { gridApi, editedValue } = setup();
      await typeAndCommit(gridApi, 'bigint_col', '9007199254740995');
      expect(readCell(gridApi, 'bigint_col')).toBe('9007199254740995');
      expect(editedValue(0, 'bigint_col')).toBe('9007199254740995');
    });

    it('multi-line text keeps its line breaks and full length', async () => {
      const { gridApi, editedValue } = setup();
      const next = `${LONG_MULTILINE_TEXT}\nmore`;
      await typeAndCommit(gridApi, 'long_text_col', next);
      expect(readCell(gridApi, 'long_text_col')).toBe(next);
      expect(editedValue(0, 'long_text_col')).toBe(next);
    });

    it('binary cell is edited as hex and saved as a binary literal', async () => {
      const { gridApi, editedValue } = setup();
      expect(editorInputValue(gridApi, 'blob_col')).toBe('0x010203');

      await typeAndCommit(gridApi, 'blob_col', '0x0a0b');

      const expected = { type: 'Buffer', data: [10, 11] };
      expect(readCell(gridApi, 'blob_col')).toEqual(expected);
      expect(editedValue(0, 'blob_col')).toEqual(expected);

      const { sql } = buildUpdateStatements({
        schemaName: 'public',
        tableName: 'items',
        pKeys: ['id'],
        pKeyValue: { id: 1 },
        update: { blob_col: editedValue(0, 'blob_col') },
        dbType: DatabaseClientType.POSTGRES,
      });
      expect(sql).toContain(`"blob_col" = decode('0a0b', 'hex')`);
    });

    it('typing into a NULL binary cell saves bytes, not text', async () => {
      const { gridApi, editedValue } = setup();

      await typeAndCommit(gridApi, 'null_blob_col', '0x0102');

      const expected = { type: 'Buffer', data: [1, 2] };
      expect(readCell(gridApi, 'null_blob_col')).toEqual(expected);
      expect(editedValue(0, 'null_blob_col')).toEqual(expected);
      const { sql } = buildUpdateStatements({
        schemaName: 'public',
        tableName: 'items',
        pKeys: ['id'],
        pKeyValue: { id: 1 },
        update: { null_blob_col: editedValue(0, 'null_blob_col') },
        dbType: DatabaseClientType.MYSQL,
      });
      expect(sql).toContain("X'0102'");
    });

    it('invalid hex in a NULL binary cell is rejected', async () => {
      const { gridApi, editedCount } = setup();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await typeAndCommit(gridApi, 'null_blob_col', 'plain text');

      expect(readCell(gridApi, 'null_blob_col')).toBeNull();
      expect(editedCount()).toBe(0);
      errorSpy.mockRestore();
    });

    it('invalid hex is rejected and the bytes are kept', async () => {
      const { gridApi, rows, editedCount } = setup();
      const before = rows[0].blob_col;
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await typeAndCommit(gridApi, 'blob_col', 'not hex');

      expect(readCell(gridApi, 'blob_col')).toBe(before);
      expect(editedCount()).toBe(0);
      errorSpy.mockRestore();
    });
  });

  describe(`${label} - editors and display`, () => {
    it('shows binary as hex and other objects as JSON, never [object Object]', () => {
      const { gridApi } = setup();
      const node = gridApi.getDisplayedRowAtIndex(0)!;
      const formatted = (colKey: string) =>
        String(
          gridApi.getCellValue({ rowNode: node, colKey, useFormatter: true })
        );

      expect(formatted('blob_col')).toBe('BINARY - 3 bytes');
      expect(formatted('bytea_col')).toBe('BINARY - 4 bytes');
      expect(formatted('empty_blob_col')).toBe('BINARY - 0 bytes');
      for (const name of ['point_col', 'pg_array_col', 'interval_col']) {
        expect(formatted(name)).not.toContain('[object Object]');
        expect(JSON.parse(formatted(name))).toEqual(node.data[name]);
      }
    });

    it('opens the AgTextCellEditor popup with the hex for binary cells', () => {
      const { gridApi } = setup();
      startEditing(gridApi, 'bytea_col');
      expect(gridApi.getCellEditorInstances()[0]).toBeInstanceOf(
        TextPopupEditorStub
      );
      gridApi.stopEditing(true);
      expect(editorInputValue(gridApi, 'bytea_col')).toBe('0xdeadbeef');
    });

    it('NULL binary cell still opens the binary popup editor', () => {
      const { gridApi } = setup();
      startEditing(gridApi, 'null_blob_col');
      expect(gridApi.getCellEditorInstances()[0]).toBeInstanceOf(
        TextPopupEditorStub
      );
      gridApi.stopEditing(true);
    });

    it('binary cell set to NULL and saved reopens the binary popup', async () => {
      const { gridApi } = setup();
      gridApi.getDisplayedRowAtIndex(0)!.setDataValue('blob_col', null);
      await settle();
      expect(readCell(gridApi, 'blob_col')).toBeNull();

      startEditing(gridApi, 'blob_col');
      expect(gridApi.getCellEditorInstances()[0]).toBeInstanceOf(
        TextPopupEditorStub
      );
      gridApi.stopEditing(true);
    });

    it('opens the JSON editor for object values in non-JSON columns', () => {
      const { gridApi } = setup();
      startEditing(gridApi, 'point_col');
      expect(gridApi.getCellEditorInstances()[0]).toBeInstanceOf(
        JsonEditorStub
      );
      gridApi.stopEditing(true);
    });

    it('opens a textarea for multi-line text', () => {
      const { gridApi } = setup();
      expect(editorInputValue(gridApi, 'multiline_col')).toBe(
        'line 1\nline 2\n'
      );
      startEditing(gridApi, 'multiline_col');
      expect(
        gridApi.getCellEditorInstances()[0].getGui().querySelector('textarea')
      ).not.toBeNull();
      gridApi.stopEditing(true);
    });

    it('shows the raw number, not a re-formatted one, in the editor', () => {
      const { gridApi } = setup();
      expect(editorInputValue(gridApi, 'tiny_float_col')).toBe('1e-7');
      expect(editorInputValue(gridApi, 'int_col')).toBe('42');
    });
  });
};

sharedGridSuite('quick query grid', () => {
  const columnTypes = ref(
    CELL_CASES.map(c => ({ name: c.name, type: c.type }))
  );
  const { columnDefs } = useQuickQueryColumnDefs({
    columnTypes,
    primaryKeyColumns: ref(['id']),
    foreignKeyColumns: ref([]),
    foreignKeys: ref([]),
    orderBy: ref({ columnName: undefined, order: undefined }),
    isViewOnly: ref(false),
    currentTableName: ref('items'),
    currentSchemaName: ref('public'),
    isHaveRelationByFieldName: () => false,
    onUpdateOrderBy: vi.fn(),
    onOpenBackReferencedTableModal: vi.fn(),
    onOpenForwardReferencedTableModal: vi.fn(),
  });
  const { editedCells, onCellValueChanged } = useQuickQueryEditedCells({
    data: ref(buildRows()),
    columnTypes,
  });
  const rows = buildRows();
  const gridApi = mountGrid({
    columnDefs: columnDefs.value,
    rowData: rows,
    onCellValueChanged,
  });

  return {
    gridApi,
    rows,
    editedCount: () => editedCells.value.length,
    editedValue: (rowIndex, field) =>
      editedCells.value.find(cell => cell.rowId === rowIndex)?.changedData[
        field
      ],
  };
});

sharedGridSuite('raw query grid', () => {
  const columns: MappedRawColumn[] = CELL_CASES.map(c => ({
    isPrimaryKey: c.name === 'id',
    isForeignKey: false,
    queryFieldName: c.name,
    originalName: c.name,
    aliasFieldName: c.name,
    sourceColumnName: c.name,
    tableName: 'items',
    schemaName: 'public',
    short_type_name: c.type,
    type: c.type,
  }));
  const rows = buildRows();
  const { editedCells, onCellValueChanged } = useRawQueryEditedCells({
    columns: ref(columns),
    originalRows: ref(buildRows()),
  });
  const columnDefs = buildRawQueryColumnDefs({
    columns,
    rows,
    reservedTables: [],
    isEditingEnabled: true,
    dirtyTracker: { cells: [] },
    onOpenRelationPreview: vi.fn(),
  });
  const gridApi = mountGrid({ columnDefs, rowData: rows, onCellValueChanged });

  return {
    gridApi,
    rows,
    editedCount: () => editedCells.value.length,
    editedValue: (rowIndex, field) =>
      editedCells.value.find(
        cell => cell.rowId === rowIndex && cell.fieldId === field
      )?.newValue,
  };
});
