import { useAppContext } from '~/shared/contexts/useAppContext';
import type QuickQueryFilter from '../quick-query-filter/QuickQueryFilter.vue';
import type QuickQueryTable from '../quick-query-table/QuickQueryTable.vue';

export const useQuickQuery = () => {
  const { connectionStore, wsStateStore } = useAppContext();
  const { connectionId, workspaceId } = toRefs(wsStateStore);

  const quickQueryFilterRef = ref<InstanceType<typeof QuickQueryFilter>>();
  const quickQueryTableRef = ref<InstanceType<typeof QuickQueryTable>>();
  const selectedRows = ref<Record<string, any>[]>([]);
  const isMutating = ref(false);

  const connectionString = computed(
    () => connectionStore.selectedConnection?.connectionString || ''
  );

  return {
    quickQueryFilterRef,
    quickQueryTableRef,
    selectedRows,
    isMutating,
    connectionString,
    connectionId,
    workspaceId,
  };
};
