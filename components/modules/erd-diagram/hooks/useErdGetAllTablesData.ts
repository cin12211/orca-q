import { toast } from 'vue-sonner';
import { useAppContext } from '~/shared/contexts';
import { useErdStore } from '~/shared/stores/erdStore';

export const useErdQueryTables = async () => {
  const { connectionStore } = useAppContext();
  const erdStore = useErdStore();

  if (
    erdStore.tables.length > 0 &&
    connectionStore.selectedConnection?.id === erdStore.currentConnectionId
  ) {
    return {
      tableSchemaStatus: 'success',
      tableSchema: erdStore.tables,
    };
  }

  const { data: tableSchemaResponse, status: tableSchemaStatus } =
    await useFetch('/api/get-tables', {
      method: 'POST',
      body: {
        dbConnectionString:
          connectionStore.selectedConnection?.connectionString,
      },
      onResponseError({ response }) {
        toast(response?.statusText);
      },
    });

  const tables = tableSchemaResponse.value?.tables || [];

  erdStore.setTables(tables);
  erdStore.setCurrentConnectionId(connectionStore.selectedConnection?.id || '');

  return {
    tableSchemaStatus,
    tableSchema: tables,
  };
};
