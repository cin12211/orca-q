<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { TreeItem, TreeRoot, TreeVirtualizer } from 'reka-ui';
import {
  ETreeFileSystemStatus,
  type FlattenedTreeFileSystemItem,
  type TreeFileSystem,
} from './treeManagement';

defineProps<{
  explorerFiles: TreeFileSystem;
  expandedState?: string[];
  selectedItems?: FlattenedTreeFileSystemItem[];
  isShowArrow?: boolean;
  isExpandedByArrow?: boolean;
  onRightClickItem?: (e: MouseEvent, item: FlattenedTreeFileSystemItem) => void;
  onClickTreeItem?: (e: MouseEvent, item: FlattenedTreeFileSystemItem) => void;
}>();

// Define emits for updating explorerFiles
const emits = defineEmits<{
  // (e: 'update:explorerFiles', value: TreeFileSystem): void;
  (e: 'update:expandedState', value: string[]): void;
  (e: 'update:selectedItems', value: FlattenedTreeFileSystemItem[]): void;
}>();

const treeRootRef = ref<HTMLElement | null>(null);

const onUpdateExpanded = (value: string[]) => {
  emits('update:expandedState', value);
};
const onUpdateSelectedItems = (value: FlattenedTreeFileSystemItem[]) => {
  emits('update:selectedItems', value);
};

const defaultCloseIcon = 'lucide:folder';

defineExpose({
  treeRootRef,
});

const selectedValue = ref<FlattenedTreeFileSystemItem[]>();

const heightItem = 24;
</script>

<template>
  <TreeRoot
    v-on:update:model-value="
      event =>
        onUpdateSelectedItems(event as unknown as FlattenedTreeFileSystemItem[])
    "
    class="list-none h-full overflow-y-auto select-none px-1 text-sm font-medium custom-scrollbar mr-1"
    :items="explorerFiles"
    :get-key="item => item.path"
    :expanded="expandedState"
    v-on:update:expanded="onUpdateExpanded"
    ref="treeRootRef"
  >
    <!-- :model-value="selectedItems" -->
    <!-- :multiple="true" -->
    <TreeVirtualizer
      v-slot="{ item }"
      :estimate-size="heightItem"
      :overscan="5"
    >
      <TreeItem
        v-slot="{ isExpanded, handleToggle, handleSelect, isSelected }"
        :key="item._id"
        :style="{
          'padding-left': `${item.level - 0.5}rem`,
          height: `${heightItem}px !important`,
        }"
        v-bind="item.bind"
        @click.right="
          (e: MouseEvent) => {
            onRightClickItem?.(e, item as FlattenedTreeFileSystemItem);
          }
        "
        @select="
          event => {
            if (event.detail.originalEvent.type === 'click') {
              event.preventDefault();
            }
          }
        "
        class="w-full data-[selected]:bg-accent cursor-pointer rounded outline-none hover:bg-accent/60"
      >
        <div
          class="flex items-center justify-between w-full flex-wrap"
          :style="{
            height: `${heightItem}px`,
          }"
          @click.shift="
            (e: MouseEvent) => {
              e.stopImmediatePropagation();

              handleSelect();
            }
          "
          @click="
            async (e: MouseEvent) => {
              selectedValue = [];

              await nextTick();

              handleSelect();

              if (item.value.status === ETreeFileSystemStatus.edit) {
                e.stopImmediatePropagation();
                e.stopPropagation();
                e.preventDefault();
                return;
              }

              onClickTreeItem?.(e, item as FlattenedTreeFileSystemItem);

              if (isExpandedByArrow) {
                e.stopImmediatePropagation();
              }
            }
          "
        >
          <div class="flex items-center flex-1 min-w-0">
            <div
              class="pr-1 flex-shrink-0"
              v-if="isShowArrow"
              @click="
                e => {
                  if (isExpandedByArrow) {
                    e.stopImmediatePropagation();
                    handleToggle();
                  }
                }
              "
            >
              <template
                v-if="item.hasChildren"
                :class="{
                  'hover:bg-background rounded-sm': isExpandedByArrow,
                }"
              >
                <Icon
                  icon="lucide:chevron-right"
                  :class="{
                    'rotate-90': isExpanded,
                    'size-4 min-w-4 transition-all': true,
                    'hover:bg-background hover:shadow hover:rounded': true,
                  }"
                />
              </template>
              <template v-else>
                <div class="size-4"></div>
              </template>
            </div>

            <template v-if="item.hasChildren">
              <Icon
                v-if="!isExpanded"
                :icon="item.value.closeIcon || defaultCloseIcon"
                class="size-4 min-w-4"
              />
              <Icon
                v-else
                :icon="item.value.icon"
                class="size-4 min-w-4"
                :class="item.value.iconClass"
              />
            </template>
            <Icon
              v-else
              :icon="item.value.icon"
              class="size-4 min-w-4"
              :class="item.value.iconClass"
            />

            <template v-if="item.value.status !== ETreeFileSystemStatus.edit">
              <div class="pl-1 truncate font-normal">
                {{ item.value.title }}
              </div>
            </template>
            <div v-else class="pl-1 w-full">
              <slot name="edit-inline" :item></slot>
            </div>
          </div>

          <div
            class="flex-shrink-0"
            v-if="item.value.status !== ETreeFileSystemStatus.edit"
          >
            <slot name="extra-actions" :item> </slot>
          </div>
        </div>
      </TreeItem>
    </TreeVirtualizer>
  </TreeRoot>
</template>
