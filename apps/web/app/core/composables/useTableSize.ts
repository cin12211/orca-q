import { getConnectionParams } from '~/core/helpers/connection-helper';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';

export const useTableSize = ({
  tableName,
  schemaName,
}: {
  tableName: string;
  schemaName: string;
}) => {
  const connectionStore = useManagementConnectionStore();

  const { data, status } = useFetch('/api/tables/size', {
    method: 'POST',
    body: {
      tableName,
      schema: schemaName,
      ...getConnectionParams(connectionStore.selectedConnection),
    },
    key: `table-size-${tableName}-${schemaName}`,
  });

  const tableSize: ComputedRef<{
    tableSize?: string;
    dataSize?: string;
    indexSize?: string;
  }> = computed(() => data.value || {});

  return { tableSize, status };
};
