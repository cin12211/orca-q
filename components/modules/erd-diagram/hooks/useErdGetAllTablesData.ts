import { toast } from 'vue-sonner';
import { useAppContext } from '~/shared/contexts';
import { createEdges, createNodes, filterTable } from '~/utils/erd/erd-utils';

export const useErdQueryTables = async () => {
  const { connectionStore } = useAppContext();

  const { data: tableSchema, status: tableSchemaStatus } = await useFetch(
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
    }
  );

  return {
    tableSchemaStatus,
    tableSchema,
  };
};
