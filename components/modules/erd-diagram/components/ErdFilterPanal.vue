<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { Icon } from '#components';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import type { TableMetadata } from '~/core/types';
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

const items = computed<Record<string, FileNode>>(() => {
  const treeTables: Record<string, FileNode> = {};

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

    treeTables[nodeTableId] = {
      id: nodeTableId,
      parentId: null,
      name: table.table,
      type: 'file',
      depth: -1,
      iconOpen: 'vscode-icons:file-type-sql',
      iconClose: 'vscode-icons:file-type-sql',
    };
  });

  return treeTables;
});

const onFocusNode = (nodeId: string) => {
  emit('focusTable', nodeId);
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
        <FileTree
          class="overflow-x-hidden"
          :initial-data="items"
          :allow-drag-and-drop="false"
          storage-key="erd-filter-tree"
          @click="onFocusNode"
        >
          <template #actions>
            <Button
              size="iconSm"
              @click="onFocusNode"
              class="hover:bg-background"
              variant="ghost"
            >
              <Icon
                name="hugeicons:dashed-line-circle"
                class="size-4! min-w-4 text-muted-foreground"
              />
            </Button>
          </template>
        </FileTree>
      </div>
    </div>
  </div>
</template>
