import { useAppContext } from '~/core/contexts/useAppContext';

export const useTableSize = ({
  tableName,
  schemaName,
}: {
  tableName: string;
  schemaName: string;
}) => {
  const { connectionStore } = useAppContext();

  const { data, status } = useFetch('/api/get-table-size', {
    method: 'POST',
    body: {
      tableName,
      dbConnectionString: connectionStore.selectedConnection?.connectionString,
      schema: schemaName,
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
