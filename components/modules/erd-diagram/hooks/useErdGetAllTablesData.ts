import { toast } from 'vue-sonner';
import { useAppContext } from '~/core/contexts';
import { useErdStore } from '~/core/stores/erdStore';
import type { TableMetadata } from '~/core/types';

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
    '/api/metadata/erd',
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
