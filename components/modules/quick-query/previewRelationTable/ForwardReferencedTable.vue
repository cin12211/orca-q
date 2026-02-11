<script setup lang="ts">
import type { FilterSchema } from '~/components/modules/quick-query/utils';
import { OperatorSet } from '~/core/constants';
import { uuidv4 } from '~/core/helpers';
import ReferencedTable from './ReferencedTable.vue';

const props = defineProps<{
  tableName: string;
  schemaName: string;
  columnName: string;
  recordId: string;
}>();

const emit = defineEmits<{
  (
    e: 'onOpenBackReferencedTableModal',
    value: {
      id: string;
      tableName: string;
      columnName: string;
      schemaName: string;
    }
  ): void;
  (
    e: 'onOpenForwardReferencedTableModal',
    value: {
      id: string;
      tableName: string;
      columnName: string;
      schemaName: string;
    }
  ): void;
}>();

const getInitFilters = () => {
  const filterSchemas: FilterSchema[] = [
    {
      fieldName: props.columnName,
      operator: OperatorSet.EQUAL,
      search: props.recordId,
      isSelect: true,
    },
  ];

  return filterSchemas;
};
</script>

<template>
  <div class="flex flex-1">
    <ReferencedTable
      :key="uuidv4()"
      :tableName="tableName"
      :schema-name="schemaName"
      :init-filters="getInitFilters()"
      @onOpenBackReferencedTableModal="
        emit('onOpenBackReferencedTableModal', $event)
      "
      @onOpenForwardReferencedTableModal="
        emit('onOpenForwardReferencedTableModal', $event)
      "
    />
  </div>
</template>
