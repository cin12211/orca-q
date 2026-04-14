import { OperatorSet } from '~/core/constants';
import type QuickQueryFilter from '../quick-query-filter/QuickQueryFilter.vue';
import type QuickQueryTable from '../quick-query-table/QuickQueryTable.vue';
import {
  normalizeFilterSearchValue,
  type FilterSchema,
} from '../utils/buildWhereClause';

interface UseQuickQueryContextCellFilterOptions {
  quickQueryFilterRef: Ref<InstanceType<typeof QuickQueryFilter> | undefined>;
  quickQueryTableRef: Ref<InstanceType<typeof QuickQueryTable> | undefined>;
  filters: Ref<FilterSchema[]>;
  onApplyNewFilter: () => void;
}

export const buildFilterFromContextCell = ({
  columnName,
  cellValue,
}: {
  columnName?: string;
  cellValue: unknown;
}): FilterSchema | null => {
  if (!columnName) {
    return null;
  }

  return {
    fieldName: columnName,
    isSelect: true,
    operator: OperatorSet.EQUAL,
    search: normalizeFilterSearchValue(cellValue),
  };
};

export const useQuickQueryContextCellFilter = ({
  quickQueryFilterRef,
  quickQueryTableRef,
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
