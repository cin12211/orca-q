import { toast } from 'vue-sonner';
import { useAppContext } from '~/core/contexts';
import { useErdStore } from '~/core/stores/erdStore';
import type { TableMetadata } from '~/server/api/get-tables';

export const useErdQueryTables = () => {
  const { connectionStore } = useAppContext();
  const erdStore = useErdStore();

  if (
    erdStore.tables.length > 0 &&
    connectionStore.selectedConnection?.id === erdStore.currentConnectionId
  ) {
    return {
      isFetching: false,
      tableSchema: toRef(erdStore.tables || []),
    };
  }

  const { data: tableSchemaResponse, status: tableSchemaStatus } = useFetch(
    '/api/get-tables',
    {
      method: 'POST',
      body: {
        dbConnectionString:
          connectionStore.selectedConnection?.connectionString,
      },
      onResponseError({ response }) {
        toast(response?.statusText);
      },
      onResponse: ({ response }) => {
        const tables = response._data.tables || ([] as TableMetadata[]);

        erdStore.setTables(tables);
        erdStore.setCurrentConnectionId(
          connectionStore.selectedConnection?.id || ''
        );
      },
    }
  );

  const isFetching = computed(() => tableSchemaStatus.value === 'pending');
  const tableSchema = computed(() => tableSchemaResponse.value?.tables || []);

  return {
    isFetching,
    tableSchema,
  };
};
