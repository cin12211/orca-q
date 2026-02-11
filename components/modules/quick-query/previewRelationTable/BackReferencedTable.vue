<script setup lang="ts">
import { Input } from '#components';
import type { FilterSchema } from '~/components/modules/quick-query/utils';
import { DEFAULT_MAX_KEEP_ALIVE, OperatorSet } from '~/core/constants';
import { useReferencedTables } from '../hooks';
import ReferencedTable from './ReferencedTable.vue';

const props = defineProps<{
  tableName: string;
  schemaName: string;
  columnName: string;
  recordId: string;
  selectedTab: string | undefined;
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
  (e: 'update:selectedTab', tab: string): void;
}>();

const { reverseTables } = useReferencedTables({
  schemaName: props.schemaName,
  tableName: props.tableName,
});

const searchInput = ref('');

const tabTables = computed(() => {
  const usedByTables = new Set<string>();

  const reverseTablesUsedBy = toRaw(reverseTables.value?.used_by) || [];

  for (const table of reverseTablesUsedBy) {
    if (table.referenced_column === props.columnName) {
      usedByTables.add(table.referencing_table);
    }
  }

  let tableList = [...usedByTables].sort();

  if (searchInput.value) {
    const lowerSearch = searchInput.value.toLowerCase();
    tableList = tableList.filter(table =>
      table.toLowerCase().includes(lowerSearch)
    );
  }

  return tableList;
});

watchEffect(() => {
  if (!props.selectedTab && tabTables.value.length > 0) {
    emit('update:selectedTab', tabTables.value[0]);
  }
});

const getInitFilters = (tabName?: string) => {
  if (!tabName) {
    return [];
  }

  const filterSchemas: FilterSchema[] = [];

  const reverseTablesUsedBy = toRaw(reverseTables.value?.used_by) || [];

  for (const table of reverseTablesUsedBy) {
    if (table.referencing_table === tabName) {
      const filterSchema: FilterSchema = {
        fieldName: table.fk_column,
        operator: OperatorSet.EQUAL,
        search: props.recordId,
        isSelect: true,
      };
      filterSchemas.push(filterSchema);
    }
  }

  return filterSchemas;
};

const onUpdateSelectedTab = (tab: string) => {
  emit('update:selectedTab', tab);
};

const onClickTab = (event: Event) => {
  const target = event.target;
  if (target instanceof HTMLElement) {
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }
};
</script>

<template>
  <Tabs
    :model-value="selectedTab"
    @update:model-value="onUpdateSelectedTab($event as string)"
    class="flex-1 flex-wrap h-full w-full"
  >
    <div class="flex justify-between items-center gap-2 w-full">
      <TabsList class="overflow-x-auto w-full justify-start!">
        <TabsTrigger
          class="cursor-pointer font-normal! flex-none!"
          v-for="tab in tabTables"
          @click="onClickTab"
          :value="tab"
          :key="tab"
        >
          {{ tab }}
        </TabsTrigger>
      </TabsList>
      <div>
        <div class="relative w-full">
          <Input
            type="text"
            placeholder="Search tables"
            class="pr-6 w-48 h-8"
            v-model="searchInput"
          />

          <div
            v-if="searchInput"
            class="absolute right-2 top-1.5 w-4 cursor-pointer hover:bg-accent"
            @click="searchInput = ''"
          >
            <Icon name="lucide:x" class="stroke-3! text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-1">
      <KeepAlive>
        <ReferencedTable
          :key="selectedTab"
          :tableName="selectedTab || ''"
          :schema-name="schemaName"
          :init-filters="getInitFilters(selectedTab)"
          @onOpenBackReferencedTableModal="
            emit('onOpenBackReferencedTableModal', $event)
          "
          @onOpenForwardReferencedTableModal="
            emit('onOpenForwardReferencedTableModal', $event)
          "
        />
      </KeepAlive>
    </div>
  </Tabs>
</template>
