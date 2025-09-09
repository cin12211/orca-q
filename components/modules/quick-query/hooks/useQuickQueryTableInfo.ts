import { toast } from 'vue-sonner';
import { useAppContext } from '~/shared/contexts/useAppContext';

export const useQuickQueryTableInfo = ({
  tableName,
  schemaName,
  connectionId,
}: {
  tableName: string;
  schemaName: string;
  connectionId: string;
}) => {
  const { connectionStore, schemaStore } = useAppContext();

  const { schemas } = toRefs(schemaStore);

  const activeSchema = computed(() => {
    return schemas.value.find(
      s => s.name === schemaName && s.connectionId === connectionId
    );
  });

  // const { data: tableSchema, status: tableSchemaStatus } = useFetch(
  //   '/api/get-one-table',
  //   {
  //     method: 'POST',
  //     body: {
  //       tableName: tableName,
  //       dbConnectionString:
  //         connectionStore.selectedConnection?.connectionString,
  //       schema: schemaName,
  //     },
  //     key: `schema-${tableName}-${schemaName}`,
  //     onResponseError({ response }) {
  //       toast(response?.statusText);
  //     },
  //   }
  // );

  const tableMetaData = computed(() => {
    const table = activeSchema.value?.tableDetails?.[tableName]!;
    return table;
  });

  const columnNames = computed(() => {
    return tableMetaData.value?.columns?.map(c => c.name) || [];
  });

  const foreignKeys = computed(() =>
    (tableMetaData.value?.foreign_keys || []).map(fk => fk.column)
  );

  const primaryKeys = computed(() =>
    (tableMetaData.value?.primary_keys || []).map(fk => fk.column)
  );

  const columnTypes = computed(() => {
    return (
      tableMetaData.value?.columns?.map(c => ({
        name: c.name,
        type: c.short_type_name,
      })) || []
    );
  });

  const isLoadingTableSchema = computed(() => {
    return false;
    // return tableSchemaStatus.value === 'pending';
  });

  return {
    primaryKeys,
    foreignKeys,
    columnNames,
    isLoadingTableSchema,
    tableMetaData,
    columnTypes,
  };
};
