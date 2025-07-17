import { useAppContext } from '~/shared/contexts';

export const useReverseTables = ({
  schemaName,
  tableName,
}: {
  schemaName: string;
  tableName: string;
}) => {
  const { schemaStore } = useAppContext();
  const { reservedSchemas } = toRefs(schemaStore);

  const reverseTables = computed(() => {
    const tables = reservedSchemas.value || [];

    return tables.find(
      table => table.table === tableName && table.schema === schemaName
    );
  });

  const isHaveRelationByFieldName = (columnName: string): boolean => {
    return !!reverseTables.value?.used_by?.some(
      item => item.referenced_column === columnName
    );
  };

  return { reservedSchemas, reverseTables, isHaveRelationByFieldName };
};
