import { toast } from 'vue-sonner';
import { useAppContext } from '~/shared/contexts/useAppContext';

export const useQuickQueryTableInfo = ({
  tableName,
  schemaName,
}: {
  tableName: string;
  schemaName: string;
}) => {
  const { connectionStore } = useAppContext();

  const { data: tableSchema, status: tableSchemaStatus } = useFetch(
    '/api/get-one-table',
    {
      method: 'POST',
      body: {
        tableName: tableName,
        dbConnectionString:
          connectionStore.selectedConnection?.connectionString,
        schema: schemaName,
      },
      key: `schema-${tableName}-${schemaName}`,
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

  const isLoadingTableSchema = computed(() => {
    return tableSchemaStatus.value === 'pending';
  });

  const tableSize = computed(() => {
    return tableSchema.value?.table_size || '0 bytes';
  });

  const dataSize = computed(() => {
    return tableSchema.value?.data_size || '0 bytes';
  });

  const indexSize = computed(() => {
    return tableSchema.value?.index_size || '0 bytes';
  });

  return {
    primaryKeys,
    foreignKeys,
    columnNames,
    isLoadingTableSchema,
    tableSchema,
    columnTypes,
    tableSize,
    dataSize,
    indexSize,
  };
};
