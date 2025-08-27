import { useAppContext } from '~/shared/contexts/useAppContext';

export const useTableSize = async ({
  tableName,
  schemaName,
}: {
  tableName: string;
  schemaName: string;
}) => {
  const { connectionStore } = useAppContext();

  const { data, status } = await useFetch('/api/get-table-size', {
    method: 'POST',
    body: {
      tableName,
      dbConnectionString: connectionStore.selectedConnection?.connectionString,
      schema: schemaName,
    },
    key: `table-size-${tableName}-${schemaName}`,
  });

  return { data, status };
};
