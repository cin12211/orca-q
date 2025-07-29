import { toast } from 'vue-sonner';
import { useAppContext } from '~/shared/contexts';
import { useErdStore } from '~/shared/stores/erdStore';

export const useErdQueryTables = async () => {
  const { connectionStore } = useAppContext();
  const erdStore = useErdStore();

  // Nếu store đã có dữ liệu & đúng connectionId, không gọi API nữa
  if (
    erdStore.tables.length > 0 &&
    connectionStore.selectedConnection?.id === erdStore.currentConnectionId
  ) {
    console.log('Store đã có dữ liệu.');
    return {
      tableSchemaStatus: 'success',
      tableSchema: erdStore.tables,
    };
  }

  // Nếu chưa có dữ liệu hoặc connectionId khác -> gọi API
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
  const tables = tableSchemaResponse.value?.result?.[0]?.metadata?.tables || [];

  // Lưu lại vào store
  erdStore.setTables(tables);
  erdStore.setCurrentConnectionId(connectionStore.selectedConnection?.id || '');

  return {
    tableSchemaStatus,
    tableSchema: tables,
  };
};
