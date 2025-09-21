<script setup lang="ts">
import { Dialog, DialogContent, Input } from '#components';
import { OperatorSet } from '~/utils/constants';
import type { FilterSchema } from '~/utils/quickQuery';
import { useReverseTables } from '../hooks';
import ReverseTable from './ReverseTable.vue';

const props = defineProps<{
  tableName: string;
  schemaName: string;
  open: boolean;
  columnName: string;
  recordId: string;
  breadcrumbs?: string[];
}>();

defineEmits(['update:open']);

const { reverseTables } = useReverseTables({
  schemaName: props.schemaName,
  tableName: props.tableName,
});

const searchInput = ref('');
const selectedTab = ref<string>();

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
  if (!selectedTab.value && tabTables.value.length > 0) {
    selectedTab.value = tabTables.value[0];
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
</script>

<template>
  <Dialog
    :open="open"
    @update:open="
      isOpen => {
        $emit('update:open', isOpen);
      }
    "
  >
    <DialogContent
      class="w-[95dvw]! max-w-[95dvw]! max-h-[90dvh] h-[90dvh] gap-3 p-3 flex flex-col flex-1 flex-wrap overflow-hidden"
    >
      <DialogHeader>
        <DialogDescription>
          <Breadcrumb>
            <BreadcrumbList class="gap-0.5!">
              <template v-for="item in breadcrumbs">
                <BreadcrumbItem>
                  {{ item }}
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </template>

              <BreadcrumbItem class="text-primary">
                {{ selectedTab }}
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </DialogDescription>
      </DialogHeader>

      <Tabs
        v-model:model-value="selectedTab"
        class="flex-1 flex-wrap h-full w-full"
      >
        <div class="flex justify-between items-center gap-2 w-full">
          <TabsList class="overflow-x-auto w-full justify-start!">
            <TabsTrigger
              class="cursor-pointer font-normal! flex-none!"
              v-for="tab in tabTables"
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
          <ReverseTable
            v-if="selectedTab"
            :key="selectedTab"
            :tableName="selectedTab"
            :schema-name="schemaName"
            :init-filters="getInitFilters(selectedTab)"
            :breadcrumbs="[...breadcrumbs, selectedTab]"
          />
          <!-- <KeepAlive :max="6"> -->
          <!-- </KeepAlive> -->
        </div>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
