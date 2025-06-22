import { toast } from 'vue-sonner';
import { useAppContext } from '~/shared/contexts/useAppContext';

export const useQuickQueryTableInfo = async ({
  tableId,
  schemaName,
}: {
  tableId: string;
  schemaName?: Ref<string | undefined, string | undefined>;
}) => {
  const { connectionStore } = useAppContext();

  const { data: tableSchema, status: tableSchemaStatus } = await useFetch(
    '/api/get-one-table',
    {
      method: 'POST',
      body: {
        tableName: tableId,
        dbConnectionString:
          connectionStore.selectedConnection?.connectionString,
        schema: schemaName?.value,
      },
      key: `schema-${tableId}`,
      onResponseError({ response }) {
        toast(response?.statusText);
      },
    }
  );

  const columnNames = computed(() => {
    return tableSchema.value?.columns?.map(c => c.name) || [];
  });

  const foreignKeys = computed(() =>
    (tableSchema.value?.foreign_keys || []).map(fk => fk.column)
  );

  const primaryKeys = computed(() =>
    (tableSchema.value?.primary_keys || []).map(fk => fk.column)
  );

  const columnTypes = computed(() => {
    return (
      tableSchema.value?.columns?.map(c => ({
        name: c.name,
        type: c.short_type_name,
      })) || []
    );
  });

  return {
    primaryKeys,
    foreignKeys,
    columnNames,
    tableSchemaStatus,
    tableSchema,
    columnTypes,
  };
};
