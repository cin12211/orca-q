<script setup lang="ts">
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { Icon } from "@iconify/vue";
import { TreeItem, TreeRoot } from "reka-ui";
import InputEditInline from "./InputEditInline.vue";
import {
  tree,
  type TreeFileSystem,
  ETreeFileSystemStatus,
  type FlattenedTreeFileSystemItem,
} from "./treeUtils";
import { uuidv4 } from "~/lib/utils";
import { useManagementExplorerStore } from "./managementExplorerStore";

const explorerStore = useManagementExplorerStore();
const { expandedState, explorerFiles } = toRefs(explorerStore);

const focusElementById = (id: string) => {
  const element = document.getElementById(id);
  element?.focus();
};

const onCreateNewFolder = async (paths: string[] = []) => {
  const title = uuidv4();
  explorerFiles.value.push({
    title,
    icon: "lucide:folder",
    children: [],
    status: ETreeFileSystemStatus.edit,
  });

  await nextTick();
  focusElementById(title);
};

const onCreateNewFile = async (paths: string[] = []) => {
  const title = uuidv4();

  explorerFiles.value.push({
    title,
    icon: "lucide:file",
    status: ETreeFileSystemStatus.edit,
  });

  await nextTick();

  focusElementById(title);
};

const onReNameFile = (
  fileInfo: FlattenedTreeFileSystemItem,
  newName: string
) => {
  explorerFiles.value = tree.rename({
    data: explorerFiles.value,
    itemId: fileInfo.value.title,
    newName,
  });
};

const onRemoveFile = (fileInfo: FlattenedTreeFileSystemItem) => {
  explorerFiles.value = tree.remove(explorerFiles.value, fileInfo.value.title);
};

const onCollapsedExplorer = () => {
  expandedState.value = [];
};
</script>

<template>
  <div class="relative w-full items-center px-3 pt-2">
    <div class="relative w-full">
      <Input
        type="text"
        placeholder="Search in all tables or functions"
        class="pl-2 w-full h-8"
      />
    </div>
  </div>

  <div class="px-3 py-2 flex items-center justify-between">
    <p class="text-sm font-medium text-muted-foreground leading-none">
      Explorer
    </p>

    <div class="flex items-center">
      <Button size="iconSm" variant="ghost" @click="onCreateNewFile">
        <Icon
          icon="lucide:file-plus-2"
          class="size-4! min-w-4 text-muted-foreground"
        />
      </Button>

      <Button size="iconSm" variant="ghost" @click="onCreateNewFolder">
        <Icon
          icon="lucide:folder-plus"
          class="size-4! min-w-4 text-muted-foreground"
        />
      </Button>

      <Button size="iconSm" variant="ghost" @click="onCollapsedExplorer">
        <Icon
          icon="lucide:copy-minus"
          class="size-4! min-w-4 text-muted-foreground"
        />
      </Button>
    </div>
  </div>

  <TreeRoot
    class="list-none h-full select-none px-1 text-sm font-medium"
    :items="explorerFiles"
    v-slot="{ flattenItems }"
    :get-key="(item) => item.title"
    v-model:expanded="expandedState"
  >
    <TreeItem
      v-for="item in flattenItems"
      v-slot="{ isExpanded }"
      :key="item._id"
      :style="{ 'padding-left': `${item.level - 0.5}rem` }"
      v-bind="item.bind"
      class="flex items-center h-7 px-1 my-0.5 cursor-pointer rounded outline-none data-[selected]:bg-accent hover:bg-accent"
      @click="
        (e: MouseEvent) => {
          if (item.value.status === ETreeFileSystemStatus.edit) {
            e.stopImmediatePropagation();
          }
        }
      "
    >
      <div class="pr-1">
        <template v-if="item.hasChildren">
          <Icon
            v-if="!isExpanded"
            icon="lucide:chevron-right"
            class="size-4 min-w-4"
          />
          <Icon v-else icon="lucide:chevron-down" class="size-4 min-w-4" />
        </template>
        <template v-else>
          <div class="size-4"></div>
        </template>
      </div>

      <template v-if="item.hasChildren">
        <Icon v-if="!isExpanded" icon="lucide:folder" class="size-4 min-w-4" />
        <Icon v-else icon="lucide:folder-open" class="size-4 min-w-4" />
      </template>
      <Icon
        v-else
        :icon="item.value.icon || 'lucide:file'"
        class="size-4 min-w-4"
      />
      <div class="pl-1 truncate" v-if="!item.value.status">
        {{ item.value.title }}
      </div>
      <div v-else class="pl-1 w-full">
        <InputEditInline
          @rename="
            (name) => {
              onReNameFile(item, name);
            }
          "
          @cancel-create="
            () => {
              onRemoveFile(item);
            }
          "
          :validate-name="
            (name) => {
              const flattenedFileNames =
                (item.parentItem?.children || explorerFiles)?.map(
                  (e) => e.title
                ) ?? [];

              return flattenedFileNames.includes(name);
            }
          "
          :id="item._id"
        />
      </div>
    </TreeItem>
  </TreeRoot>
</template>
