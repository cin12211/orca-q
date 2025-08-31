<script lang="ts" setup>
import { ref } from 'vue';
import type { ColDef, Column } from 'ag-grid-community';
import { useTableSize } from '~/composables/useTableSize.js';
import { cn } from '~/lib/utils.js';

type Props = {
  tableName: string;
  schemaName: string;
  columns: ColDef<any, any>[] | undefined;
  selectedColumnFieldId?: string | undefined;
  handleSelectColumn: (column: Column) => void;
  columnTypes: {
    name: string;
    type: string;
  }[];
};

const {
  tableName,
  schemaName,
  columns,
  columnTypes,
  selectedColumnFieldId,
  handleSelectColumn,
} = defineProps<Props>();

const emit = defineEmits<{
  (e: 'resetSelectedCol'): void;
}>();

const tableSizeSummary = ref<{
  tableSize?: string;
  dataSize?: string;
  indexSize?: string;
}>({});

if (tableName && schemaName) {
  const { data } = await useTableSize({
    tableName: tableName,
    schemaName: schemaName,
  });

  tableSizeSummary.value = data.value || {};
}

const mappedColumns = (
  columns?.map(col => {
    const typeInfo = columnTypes?.find(ct => ct.name === col.field && ct.name);
    if (typeInfo) {
      return {
        ...col,
        type: typeInfo?.type || '',
      };
    }
  }) || []
).slice(1);

const formatColumnType = (columnType: string | undefined) => {
  if (columnType === 'timestamp without time zone') {
    return 'timestamp';
  }

  return columnType || '';
};

watchEffect(onCleanup => {
  onCleanup(() => {
    if (selectedColumnFieldId !== undefined) {
      emit('resetSelectedCol');
    }
  });
});
</script>

<template>
  <div>
    <Card class="m-1 py-2 px-1">
      <CardContent class="px-2">
        <div class="flex flex-col gap-y-1">
          <div class="flex items-center justify-between w-full">
            <span class="text-xs">Table Size:</span>
            <span class="text-xs opacity-75">{{
              tableSizeSummary.tableSize
            }}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <span class="text-xs">Data Size:</span>
            <span class="text-xs opacity-75">{{
              tableSizeSummary.dataSize
            }}</span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <span class="text-xs">Index Size:</span>
            <span class="text-xs opacity-75">{{
              tableSizeSummary.indexSize
            }}</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card
      :class="
        cn(
          'mx-1 mt-3 py-2 px-1 h-[calc(100vh-10em)] overflow-y-auto custom-scrollbar',
          columns?.length === 0 && 'hidden'
        )
      "
    >
      <CardContent class="px-0">
        <div
          v-for="column in mappedColumns"
          :key="column?.field"
          class="cursor-pointer hover:bg-accent/50 rounded-sm"
          :class="cn(selectedColumnFieldId === column?.field && 'bg-accent/90')"
        >
          <div
            class="flex items-center gap-2 justify-start p-1"
            @click="handleSelectColumn(column?.field as unknown as Column<any>)"
          >
            <Icon name="lucide:columns-3" class="size-4 min-w-3" />
            <div class="flex justify-between text-xs w-full overflow-hidden">
              <span
                class="w-3/4 truncate max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap inline-block"
                :title="column?.headerName"
              >
                {{ column?.headerName || '' }}
              </span>
              <span class="opacity-50 w-1/4 min-w-[100px] text-right">
                {{ formatColumnType(column?.type) }}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<style lang="css" scoped></style>
