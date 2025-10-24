<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { Icon } from '#components';
import {
  type FlattenedTreeFileSystemItem,
  type TreeFileSystemItem,
} from '~/components/base/Tree';
import type { TableMetadata } from '~/server/api/get-tables';
import { DEFAULT_DEBOUNCE_INPUT } from '~/utils/constants';
import { buildTableNodeId, detructTableNodeId } from '../utils';

const props = defineProps<{
  isShowFilter: boolean;
  tables: TableMetadata[];
  tableId?: string;
}>();

const emit = defineEmits<{
  (e: 'update:isShowFilter', value: boolean): void;
  (e: 'focusTable', id: string): void;
}>();

const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

const tableInfo = computed(() => {
  return detructTableNodeId(props.tableId || '');
});

const items = computed(() => {
  const treeTables: TreeFileSystemItem[] = [];

  props.tables.forEach(table => {
    if (
      !table.table.toLowerCase().includes(debouncedSearch.value.toLowerCase())
    ) {
      return;
    }

    const nodeTableId = buildTableNodeId({
      schemaName: table.schema,
      tableName: table.table,
    });

    // const columns = table.columns;
    // const mapPK = new Map(table.primary_keys.map(item => [item.column, item]));
    // const mapFK = new Map(table.foreign_keys.map(item => [item.column, item]));

    const treeItem: TreeFileSystemItem = {
      title: table.table,
      id: nodeTableId,
      icon: 'vscode-icons:file-type-sql',
      closeIcon: 'vscode-icons:file-type-sql',
      path: nodeTableId,
      // children: [
      //   ...columns.map(column => {
      //     let icon = 'hugeicons:diamond';
      //     let iconClass = 'text-gray-300';

      //     const isPk = mapPK.has(column.name);
      //     const isFk = mapFK.has(column.name);

      //     if (isPk || isFk) {
      //       icon = 'hugeicons:key-01';

      //       if (isPk) {
      //         iconClass = 'text-yellow-400';
      //       } else {
      //         iconClass = 'text-gray-400';
      //       }
      //     } else if (column.nullable) {
      //       icon = 'mynaui:diamond-solid';
      //     }

      //     return {
      //       title: column.name,
      //       id: column.name,
      //       icon,
      //       iconClass,
      //       paths: [table.table, column.name],
      //       isFolder: false,
      //     };
      //   }),
      // ],
      isFolder: false,
    };

    treeTables.push(treeItem);
  });

  return treeTables;
});

const onFocusNode = (_e: MouseEvent, item: FlattenedTreeFileSystemItem) => {
  const { value } = item;

  emit('focusTable', value.id);
};
</script>
<template>
  <div
    class="flex flex-col h-full bg-background absolute right-0 top-0 shadow transition-all ease-in-out"
    :class="[isShowFilter ? 'w-[20rem]' : 'w-[0rem]']"
  >
    <div
      class="w-5 h-8 absolute -left-5 top-2 cursor-pointer bg-background border border-r-0 rounded-l-md flex-col justify-center flex items-center"
      @click="emit('update:isShowFilter', !isShowFilter)"
    >
      <Icon
        v-if="isShowFilter"
        name="hugeicons:arrow-right-01"
        class="size-5!"
      />
      <Icon v-else name="hugeicons:arrow-left-01" class="size-5!" />
    </div>

    <!-- Header -->
    <div class="px-2 pt-2 flex flex-col h-full w-full">
      <div>
        <h1 class="text-base font-normal">
          {{ tableInfo.tableName }}
        </h1>
        <p class="text-muted-foreground text-sm">
          This view only show this table and relations
        </p>
      </div>

      <div class="relative w-full pt-2 mb-2">
        <Input
          type="text"
          placeholder="Search tables"
          class="pr-6 w-full h-8"
          v-model="searchInput"
        />

        <div
          v-if="searchInput"
          class="absolute right-2 top-3.5 w-4 cursor-pointer hover:bg-accent"
          @click="searchInput = ''"
        >
          <Icon name="lucide:x" class="stroke-3! text-muted-foreground" />
        </div>
      </div>

      <div class="h-full w-[19rem] overflow-y-auto">
        <TreeFolder
          class="overflow-x-hidden"
          ref="treeFolderRef"
          v-model:explorerFiles="items"
          :isShowArrow="false"
          :isExpandedByArrow="false"
          @click-tree-item="onFocusNode"
        >
          <template #extra-actions>
            <Button size="iconSm" class="hover:bg-background" variant="ghost">
              <Icon
                name="hugeicons:dashed-line-circle"
                class="size-4! min-w-4 text-muted-foreground"
              />
            </Button>
          </template>
        </TreeFolder>
      </div>
    </div>
  </div>
</template>
