<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { TreeItem, TreeRoot } from "reka-ui";
import {
  ETreeFileSystemStatus,
  getTreeItemPath,
  type FlattenedTreeFileSystemItem,
  type TreeFileSystem,
} from "./treeUtils";

defineProps<{
  explorerFiles: TreeFileSystem;
  expandedState?: string[];
  isShowArrow?: boolean;
  isExpandedByArrow?: boolean;
  onRightClickItem?: (e: MouseEvent, item: FlattenedTreeFileSystemItem) => void;
  onClickTreeItem?: (e: MouseEvent, item: FlattenedTreeFileSystemItem) => void;
}>();

// Define emits for updating explorerFiles
const emits = defineEmits<{
  (e: "update:explorerFiles", value: TreeFileSystem): void;
  (e: "update:expandedState", value: string[]): void;
}>();

const onUpdateExpanded = (value: string[]) => {
  emits("update:expandedState", value);
};

const defaultCloseIcon = "lucide:folder";
</script>

<template>
  <TreeRoot
    class="list-none h-full overflow-y-auto select-none px-1 text-sm font-medium"
    :items="explorerFiles"
    :get-key="(item) => getTreeItemPath(item.paths || [])"
    :expanded="expandedState"
    v-slot="{ flattenItems }"
    v-on:update:expanded="onUpdateExpanded"
  >
    <TreeItem
      v-for="item in flattenItems"
      v-slot="{ isExpanded, handleToggle }"
      :key="item._id"
      :style="{
        'padding-left': `${item.level - 0.5}rem`,
      }"
      v-bind="item.bind"
      class="flex items-center justify-between w-full h-7 px-1 my-0.5 cursor-pointer rounded outline-none data-[selected]:bg-accent hover:bg-accent"
      @click="
        (e: MouseEvent) => {
          onClickTreeItem?.(e, item);

          if (isExpandedByArrow) {
            e.stopImmediatePropagation();
          }

          if (item.value.status === ETreeFileSystemStatus.edit) {
            e.stopImmediatePropagation();
          }
        }
      "
      @click.right="
        (e: MouseEvent) => {
          console.log('onRightClickItem', item);

          onRightClickItem?.(e, item);
        }
      "
    >
      <div class="flex items-center w-full">
        <div
          class="pr-1"
          v-if="isShowArrow"
          @click="
            () => {
              if (isExpandedByArrow) {
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
          <Icon v-else :icon="item.value.icon" class="size-4 min-w-4" />
        </template>
        <Icon v-else :icon="item.value.icon" class="size-4 min-w-4" />

        <template v-if="item.value.status !== ETreeFileSystemStatus.edit">
          <div class="pl-1 truncate">{{ item.value.title }}</div>
        </template>
        <div v-else class="pl-1 w-full">
          <slot name="edit-inline" :item></slot>
        </div>
      </div>

      <div v-if="item.value.status !== ETreeFileSystemStatus.edit">
        <slot name="extra-actions" :item> </slot>
      </div>
    </TreeItem>
  </TreeRoot>
</template>
