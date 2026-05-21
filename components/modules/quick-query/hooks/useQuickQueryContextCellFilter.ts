import { OperatorSet } from '~/core/constants';
import {
  normalizeFilterSearchValue,
  SqlFilterValueType,
  type FilterSchema,
} from '~/core/helpers/sql-where-clause';
import type QuickQueryFilter from '../quick-query-filter/QuickQueryFilter.vue';
import type QuickQueryTable from '../quick-query-table/QuickQueryTable.vue';
import type { QuickQueryColumnType } from '../utils/quickQueryTable';

interface UseQuickQueryContextCellFilterOptions {
  quickQueryFilterRef: Ref<InstanceType<typeof QuickQueryFilter> | undefined>;
  quickQueryTableRef: Ref<InstanceType<typeof QuickQueryTable> | undefined>;
  columnTypes?: Ref<QuickQueryColumnType[]>;
  filters: Ref<FilterSchema[]>;
  onApplyNewFilter: () => void;
}

const isPostgresArrayColumnType = (columnType?: string) =>
  !!columnType?.trim().endsWith('[]');

export const buildFilterFromContextCell = ({
  columnName,
  columnType,
  cellValue,
}: {
  columnName?: string;
  columnType?: string;
  cellValue: unknown;
}): FilterSchema | null => {
  if (!columnName) {
    return null;
  }

  const isPostgresArrayValue =
    Array.isArray(cellValue) && isPostgresArrayColumnType(columnType);

  return {
    fieldName: columnName,
    isSelect: true,
    operator: OperatorSet.EQUAL,
    valueType: isPostgresArrayValue
      ? SqlFilterValueType.POSTGRES_ARRAY
      : undefined,
    search: normalizeFilterSearchValue(cellValue, {
      preserveArray: isPostgresArrayValue,
    }),
  };
};

export const useQuickQueryContextCellFilter = ({
  quickQueryFilterRef,
  quickQueryTableRef,
  columnTypes,
  filters,
  onApplyNewFilter,
}: UseQuickQueryContextCellFilterOptions) => {
  const appendFilter = (filter: FilterSchema) => {
    filters.value = [...filters.value, filter];
  };

  const onAddFilterByContextCell = async () => {
    const cellContextMenu = quickQueryTableRef.value?.cellContextMenu;

    if (!cellContextMenu) {
      return;
    }

    const filter = buildFilterFromContextCell({
      columnName: cellContextMenu.colDef.field,
      columnType: columnTypes?.value.find(
        column => column.name === cellContextMenu.colDef.field
      )?.type,
      cellValue: cellContextMenu.value,
    });

    if (!filter) {
      return;
    }

    appendFilter(filter);

    await nextTick();

    quickQueryFilterRef.value?.onShowSearch();

    onApplyNewFilter();
  };

  return {
    appendFilter,
    onAddFilterByContextCell,
  };
};
