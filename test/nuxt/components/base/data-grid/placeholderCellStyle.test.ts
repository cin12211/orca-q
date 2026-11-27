import { ref } from 'vue';
import type { CellClassParams } from 'ag-grid-community';
import { describe, expect, it, vi } from 'vitest';
import { useQuickQueryGridOptions } from '~/components/modules/quick-query/hooks/useQuickQueryGridOptions';
import { buildRawQueryColumnDefs } from '~/components/modules/raw-query/utils/buildRawQueryColumnDefs';
import type { MappedRawColumn } from '~/core/types/mapped-column.types';

const MUTED = 'var(--muted-foreground)';
const binary = { type: 'Buffer', data: [1, 2, 3] };

type CellStyleFn = (params: CellClassParams) => { color?: string } | undefined;

const styleParams = (field: string, value: unknown) =>
  ({
    value,
    colDef: { field, colId: field },
    node: { id: '0', rowIndex: 0 },
  }) as unknown as CellClassParams;

describe('placeholder cells are muted like NULL', () => {
  it('raw query: BINARY summary and NULL are muted, real values are not', () => {
    const column: MappedRawColumn = {
      isPrimaryKey: false,
      isForeignKey: false,
      queryFieldName: 'content',
      originalName: 'content',
      aliasFieldName: 'content',
      tableName: 'files',
      schemaName: 'public',
      short_type_name: 'bytea',
    };
    const [, colDef] = buildRawQueryColumnDefs({
      columns: [column],
      rows: [],
      reservedTables: [],
      isEditingEnabled: false,
      dirtyTracker: { cells: [] },
      onOpenRelationPreview: vi.fn(),
    });
    const cellStyle = colDef.cellStyle as CellStyleFn;

    expect(cellStyle(styleParams('content', binary))?.color).toBe(MUTED);
    expect(cellStyle(styleParams('content', null))?.color).toBe(MUTED);
    expect(cellStyle(styleParams('content', 'text'))?.color).toBeUndefined();
  });

  it('quick query: BINARY summary is muted until the cell is edited', () => {
    const data = ref<Record<string, unknown>[]>([{ content: binary }]);
    const { columnTypes } = useQuickQueryGridOptions({
      data,
      selectedColumnFieldId: ref(undefined),
      isJSONColumn: () => false,
      gridApi: ref(undefined),
    });
    const cellStyle = columnTypes.value.editableColumn.cellStyle as CellStyleFn;

    expect(cellStyle(styleParams('content', binary))?.color).toBe(MUTED);
    expect(cellStyle(styleParams('content', 'plain'))?.color).toBeUndefined();
  });
});
