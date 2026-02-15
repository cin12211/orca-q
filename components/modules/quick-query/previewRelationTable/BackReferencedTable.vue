<script setup lang="ts">
import { Input } from '#components';
import type { FilterSchema } from '~/components/modules/quick-query/utils';
import { OperatorSet } from '~/core/constants';
import { useReferencedTables } from '../hooks';
import ReferencedTable from './ReferencedTable.vue';

const props = defineProps<{
  tableName: string;
  schemaName: string;
  columnName: string;
  recordId: string;
  selectedTab: string | undefined;
  connectionId: string;
  workspaceId: string;
  rootSchemaName: string;
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
  (e: 'update:selectedTab', table: string, schemaName: string): void;
}>();

const { reverseTables } = useReferencedTables({
  schemaName: props.schemaName,
  tableName: props.tableName,
});

const searchInput = ref('');

const tabTables = computed(() => {
  const usedByTables = new Map<string, { table: string; schema: string }>();

  const reverseTablesUsedBy = toRaw(reverseTables.value?.used_by) || [];

  for (const table of reverseTablesUsedBy) {
    if (table.referenced_column === props.columnName) {
      usedByTables.set(table.referencing_table, {
        table: table.referencing_table,
        schema: table.referencing_schema,
      });
    }
  }

  let tableList = [...usedByTables.values()].sort((a, b) =>
    a.table.localeCompare(b.table)
  );

  if (searchInput.value) {
    const lowerSearch = searchInput.value.toLowerCase();
    tableList = tableList.filter(table =>
      table.table.toLowerCase().includes(lowerSearch)
    );
  }

  return tableList;
});

watchEffect(() => {
  if (!props.selectedTab && tabTables.value.length > 0) {
    emit(
      'update:selectedTab',
      tabTables.value[0].table,
      tabTables.value[0].schema
    );
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

const onUpdateSelectedTab = (tabKey: string) => {
  const { schemaName, tableName } = extractSchemaAndTableFromKey(tabKey);
  emit('update:selectedTab', tableName, schemaName);
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

const buildTabKey = (tab: { table: string; schema: string }) => {
  return `${tab.schema}.${tab.table}`;
};

const extractSchemaAndTableFromKey = (tabKey: string) => {
  const [schemaName, tableName] = tabKey.split('.');

  return {
    schemaName,
    tableName,
  };
};
</script>

<template>
  <Tabs
    :model-value="buildTabKey({ table: selectedTab || '', schema: schemaName })"
    @update:model-value="onUpdateSelectedTab($event as string)"
    class="flex-1 flex-wrap h-full w-full"
  >
    <div class="flex justify-between items-center gap-2 w-full">
      <TabsList class="overflow-x-auto w-full justify-start!">
        <TabsTrigger
          class="cursor-pointer font-normal! flex-none!"
          v-for="tab in tabTables"
          @click="onClickTab"
          :value="buildTabKey(tab)"
          :key="buildTabKey(tab)"
        >
          {{ rootSchemaName === tab.schema ? null : `${tab.schema}.`
          }}{{ tab.table }}
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
          :connectionId="props.connectionId"
          :workspaceId="props.workspaceId"
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
