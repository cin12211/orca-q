<script setup lang="ts">
import { KeepAlive } from 'vue';
import { Dialog, DialogContent, Input, LoadingOverlay } from '#components';
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

const tabTables = computed(() => {
  const used_by = new Set(
    (reverseTables.value?.used_by || [])
      .filter(item => item.referenced_column === props.columnName)
      .map(item => item.referencing_table)
  );

  const tabs = [...used_by].sort().map(refTable => ({
    value: refTable,
    label: refTable,
  }));

  if (searchInput.value) {
    return tabs.filter(item =>
      item.label.toLowerCase().includes(searchInput.value.toLowerCase())
    );
  }

  return tabs;
});

const selectedTab = ref(tabTables.value[0].value);

const getInitFilters = (tabName: string) => {
  const reverseTableInfos =
    reverseTables.value?.used_by?.filter(
      item => item.referencing_table === tabName
    ) || [];

  return reverseTableInfos.map(item => {
    const filterSchema: FilterSchema = {
      fieldName: item.fk_column,
      operator: OperatorSet.EQUAL,
      search: props.recordId,
      isSelect: true,
    };

    return filterSchema;
  });
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
              :value="tab.value"
            >
              {{ tab.label }}
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
            <component
              :is="ReverseTable"
              :key="selectedTab"
              :tableName="selectedTab"
              :schema-name="schemaName"
              :init-filters="getInitFilters(selectedTab)"
              :breadcrumbs="[...breadcrumbs, selectedTab]"
            />
          </KeepAlive>
        </div>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
