<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { Icon } from '#components';
import dayjs from 'dayjs';
import {
  ETreeFileSystemStatus,
  type FlattenedTreeFileSystemItem,
} from '~/components/base/Tree';
import TreeItemInputEditInline from '~/components/base/Tree/TreeItemInputEditInline.vue';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { uuidv4 } from '~/core/helpers';
import { useExplorerFileStore } from '~/core/stores';
import { useManagementExplorerStore } from '~/core/stores/managementExplorerStore';
import { TabViewType, useTabViewsStore } from '~/core/stores/useTabViewsStore';
import TreeFolder from '../../base/Tree/TreeFolder.vue';

const route = useRoute('workspaceId-connectionId-explorer-fileId');

const explorerFileStore = useExplorerFileStore();
const explorerStore = useManagementExplorerStore();

const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

const { onRemoveExpandedByPath, onCollapsedExplorer, onUpdateExpandedState } =
  explorerStore;

const { expandedState } = toRefs(explorerStore);
const { treeNodeRef } = toRefs(explorerFileStore);

const selectedItems = ref<FlattenedTreeFileSystemItem[]>([]);

const rightClickSelectedItem = ref<FlattenedTreeFileSystemItem | null>(null);

const editFileNameInlineRef = useTemplateRef<InstanceType<
  typeof TreeItemInputEditInline
> | null>('editFileNameInline');

const tabViewStore = useTabViewsStore();

const onAddNewItem = async ({
  node,
  isFolder,
}: {
  node?: FlattenedTreeFileSystemItem;
  isFolder: boolean;
}) => {
  const connectionId = route.params.connectionId;
  const workspaceId = route.params.workspaceId;

  const defaultFolder = {
    title: '',
    id: uuidv4(),
    icon: 'lucide:folder-open',
    closeIcon: 'lucide:folder',
    status: ETreeFileSystemStatus.edit,
    connectionId,
    workspaceId,
    createdAt: dayjs().toISOString(),
    isFolder: true,
    path: '',
    children: [],
  };

  const defaultFile = {
    title: '',
    id: uuidv4(),
    icon: 'lucide:file',
    status: ETreeFileSystemStatus.edit,
    connectionId,
    workspaceId,
    createdAt: dayjs().toISOString(),
    isFolder: false,
    path: '',
    children: undefined,
  };

  const item = isFolder ? defaultFolder : defaultFile;

  const nodeId = node?.value.id;
  treeNodeRef.value.insertNode(nodeId || null, item);

  treeNodeRef.value.sortByTitle();

  if (node?.value.isFolder) {
    onUpdateExpandedState(node?.value.path);
  }

  await nextTick();

  editFileNameInlineRef.value?.$el?.focus();
};

const onRenameFile = (
  fileInfo: FlattenedTreeFileSystemItem,
  newName: string
) => {
  const newPath =
    (fileInfo.value.path as string).split('/').slice(0, -1).join('/') +
    '/' +
    newName;

  const oldPath = fileInfo.value.path;

  const isExpanded = expandedState.value.includes(oldPath);

  if (isExpanded) {
    onUpdateExpandedState(newPath, oldPath);
  }

  treeNodeRef.value.updateNode(fileInfo.value.id, {
    status: ETreeFileSystemStatus.onlyView,
    title: newName,
  });
};

const onDeleteNodeById = (id: string, node?: FlattenedTreeFileSystemItem) => {
  treeNodeRef.value.deleteNode(id);

  if (node) {
    onRemoveExpandedByPath(node.value.path);
  }
};

const onCancelEditNode = (node: FlattenedTreeFileSystemItem) => {
  if (node.value.title === '') {
    onDeleteNodeById(node.value.id);
    return;
  }

  const id = node.value.id;
  treeNodeRef.value.updateNode(
    id,
    {
      status: ETreeFileSystemStatus.onlyView,
    },
    false
  );
};

const onSetAllowEditFileName = async (
  fileInfo: FlattenedTreeFileSystemItem
) => {
  treeNodeRef.value.updateNode(
    fileInfo.value.id,
    {
      status: ETreeFileSystemStatus.edit,
    },
    false
  );

  await nextTick();

  if (editFileNameInlineRef.value) {
    const inputEl = editFileNameInlineRef.value.$el as HTMLInputElement;

    inputEl.value = fileInfo.value.title;

    inputEl.focus();
    // move cursor to the end
    const length = fileInfo.value?.title?.length;
    inputEl.setSelectionRange(length, length);
  }
};

const onRightClickItem = (_: MouseEvent, item: FlattenedTreeFileSystemItem) => {
  rightClickSelectedItem.value = item;
};

const onDelayedCallback = (callBack: () => void) => {
  setTimeout(async () => {
    callBack();
  }, 200);
};

const mappedExplorerFiles = computed(() => {
  if (debouncedSearch.value) {
    return treeNodeRef.value.searchByTitle(debouncedSearch.value);
  }

  return treeNodeRef.value.tree;
});

const onClickNode = (item: FlattenedTreeFileSystemItem) => {
  if (item?.value.isFolder) {
    return;
  }

  tabViewStore.openTab({
    icon: item.value.icon,
    id: item.value.id,
    name: item.value.title,
    type: TabViewType.CodeQuery,
    routeName: 'workspaceId-connectionId-explorer-fileId',
    routeParams: {
      fileId: item.value.id,
    },
    connectionId: route.params.connectionId,
    schemaId: '',
    workspaceId: route.params.workspaceId,
    tableName: item.value.title,
  });

  tabViewStore.selectTab(item.value.id);
};
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-y-auto">
    <div class="px-3">
      <div class="relative w-full pt-2">
        <Input
          type="text"
          placeholder="Search in all tables or functions"
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

      <div class="pt-2 flex items-center justify-between">
        <p class="text-sm font-medium text-muted-foreground leading-none">
          Explorer
        </p>

        <div class="flex items-center">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="iconSm"
                variant="ghost"
                @click="() => onAddNewItem({ isFolder: false })"
              >
                <Icon
                  name="lucide:file-plus-2"
                  class="size-4! min-w-4 text-muted-foreground"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent> New File </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="iconSm"
                variant="ghost"
                @click="() => onAddNewItem({ isFolder: true })"
              >
                <Icon
                  name="lucide:folder-plus"
                  class="size-4! min-w-4 text-muted-foreground"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent> New Folder </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                size="iconSm"
                variant="ghost"
                @click="onCollapsedExplorer"
              >
                <Icon
                  name="lucide:copy-minus"
                  class="size-4! min-w-4 text-muted-foreground"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent> Collapse All </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>

    <div class="w-full h-full overflow-y-auto">
      <ContextMenu
        @update:open="
          isOpen => {
            if (!isOpen) {
            }
          }
        "
      >
        <ContextMenuTrigger>
          <TreeFolder
            class="pt-1"
            :explorerFiles="mappedExplorerFiles"
            v-model:expandedState="expandedState"
            v-model:selectedItems="selectedItems"
            is-show-arrow
            :onRightClickItem="onRightClickItem"
            v-on:clickTreeItem="
              (_, item) => {
                onClickNode(item);
              }
            "
          >
            <template #edit-inline="{ item }">
              <TreeItemInputEditInline
                ref="editFileNameInline"
                @onRename="
                  onRenameFile(item as FlattenedTreeFileSystemItem, $event)
                "
                @onCancelEdit="
                  onCancelEditNode(item as FlattenedTreeFileSystemItem)
                "
                @onDeleteFile="
                  onDeleteNodeById(
                    item.value.id,
                    item as FlattenedTreeFileSystemItem
                  )
                "
                :validate-name="
                  name => {
                    return treeNodeRef.isExitNodeNameInPath(
                      name,
                      item.value.id,
                      item.value?.parentId
                    );
                  }
                "
                :id="item._id"
              />
            </template>
          </TreeFolder>
        </ContextMenuTrigger>

        <ContextMenuContent class="w-56">
          <ContextMenuItem
            @select="
              () => {
                onDelayedCallback(() => {
                  rightClickSelectedItem &&
                    onAddNewItem({
                      node: rightClickSelectedItem,
                      isFolder: false,
                    });
                });
              }
            "
            v-if="
              rightClickSelectedItem?.hasChildren || !rightClickSelectedItem
            "
          >
            <Icon
              name="lucide:file-plus-2"
              class="size-4! min-w-4 text-muted-foreground"
            />
            Add new file
          </ContextMenuItem>
          <ContextMenuItem
            v-if="
              rightClickSelectedItem?.hasChildren || !rightClickSelectedItem
            "
            @select="
              () => {
                onDelayedCallback(() => {
                  rightClickSelectedItem &&
                    onAddNewItem({
                      node: rightClickSelectedItem,
                      isFolder: true,
                    });
                });
              }
            "
          >
            <Icon
              name="lucide:folder-plus"
              class="size-4! min-w-4 text-muted-foreground"
            />
            Add new folder
          </ContextMenuItem>

          <ContextMenuItem
            v-if="rightClickSelectedItem"
            @select="
              () => {
                onDelayedCallback(() => {
                  rightClickSelectedItem &&
                    onSetAllowEditFileName(rightClickSelectedItem);
                });
              }
            "
          >
            <Icon
              name="lucide:pencil"
              class="size-4! min-w-4 text-muted-foreground"
            />
            Rename...
          </ContextMenuItem>
          <ContextMenuItem
            v-if="rightClickSelectedItem"
            variant="destructive"
            @click.stop="
              () =>
                rightClickSelectedItem &&
                onDeleteNodeById(
                  rightClickSelectedItem.value.id,
                  rightClickSelectedItem
                )
            "
          >
            <Icon
              name="lucide:trash"
              class="size-4! min-w-4 text-muted-foreground"
            />Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  </div>
</template>

<!-- TODO: add move able file/ folder ,  -->
<!-- TODO: check function of menu context for 3 case : [file, folder, root]  -->
<!-- TODO: control file content / persist / restore  -->
<!-- TODO: save state search / expanded state  -->
