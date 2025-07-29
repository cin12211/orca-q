<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { Icon } from '#components';
import {
  ETreeFileSystemStatus,
  getTreeItemPath,
  tree,
  type FlattenedTreeFileSystemItem,
} from '~/components/base/Tree';
import TreeItemInputEditInline from '~/components/base/Tree/TreeItemInputEditInline.vue';
import { useAppContext } from '~/shared/contexts';
import {
  TabViewType,
  useTabViewsStore,
} from '~/shared/stores/useTabViewsStore';
import { DEFAULT_DEBOUNCE_INPUT } from '~/utils/constants';
import { useManagementExplorerStore } from '../../../shared/stores/managementExplorerStore';
import TreeFolder from '../../base/Tree/TreeFolder.vue';

const { wsStateStore } = useAppContext();
const { connectionId, schemaId, workspaceId } = toRefs(wsStateStore);

const explorerStore = useManagementExplorerStore();

const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

const { expandedState, explorerFiles } = toRefs(explorerStore);

const selectedItems = ref<FlattenedTreeFileSystemItem[]>([]);

const rightClickSelectedItem = ref<FlattenedTreeFileSystemItem | null>(null);

const editFileNameInlineRef = useTemplateRef<InstanceType<
  typeof TreeItemInputEditInline
> | null>('editFileNameInline');

const onUpdateExpandedState = (paths: string[], oldPaths?: string[]) => {
  const newStringPath = getTreeItemPath(paths);

  const uniquePaths = new Set([...(expandedState.value || []), newStringPath]);

  if (oldPaths) {
    const oldStringPath = getTreeItemPath(oldPaths);

    expandedState.value = [...uniquePaths].map(e => {
      if (e.startsWith(oldStringPath)) {
        return e.replace(oldStringPath, newStringPath);
      }

      return e;
    });
  } else {
    expandedState.value = [...uniquePaths];
  }
};

const onAddNewItem = async ({
  paths,
  isFolder,
}: {
  paths?: string[];
  isFolder: boolean;
}) => {
  if (paths) {
    onUpdateExpandedState(paths);
  }

  explorerFiles.value = tree.onAddNewItemByPath({
    data: explorerFiles.value,
    paths,
    isFolder,
  });

  await nextTick();
  editFileNameInlineRef.value?.$el?.focus();
};

const onReNameFile = (
  fileInfo: FlattenedTreeFileSystemItem,
  newName: string
) => {
  const isExpanded = expandedState.value.includes(
    getTreeItemPath(fileInfo.value.paths)
  );

  const newPaths = [...fileInfo.value.paths.slice(0, -1), newName];
  const paths = fileInfo.value.paths;

  explorerFiles.value = tree.renameByPath({
    items: explorerFiles.value,
    paths: fileInfo.value.paths,
    newName,
  });

  if (isExpanded) {
    onUpdateExpandedState(newPaths, paths);
  }
};

const onRemoveItemByPaths = (fileInfo: FlattenedTreeFileSystemItem) => {
  console.log('🚀 ~ onRemoveItemByPaths ~ fileInfo:', fileInfo);
  explorerFiles.value = tree.removeItemByPaths(
    explorerFiles.value,
    fileInfo.value.paths
  );
};

const onCollapsedExplorer = () => {
  expandedState.value = [];
};

const onSetAllowEditFileName = async (
  fileInfo: FlattenedTreeFileSystemItem
) => {
  explorerFiles.value = tree.updateByPath({
    items: explorerFiles.value,
    paths: fileInfo.value.paths,
    newItem: item => {
      return {
        ...item,
        status: ETreeFileSystemStatus.edit,
      };
    },
  });

  await nextTick();

  if (editFileNameInlineRef.value) {
    editFileNameInlineRef.value.inputValue = fileInfo.value.title;
    editFileNameInlineRef.value?.$el?.focus();
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

const tabViewStore = useTabViewsStore();

const mappedExplorerFiles = computed(() => {
  if (!debouncedSearch.value) {
    return explorerFiles.value;
  }

  return tree.filterByTitle({
    data: explorerFiles.value,
    title: debouncedSearch.value,
  });
});
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

          <Button size="iconSm" variant="ghost" @click="onCollapsedExplorer">
            <Icon
              name="lucide:copy-minus"
              class="size-4! min-w-4 text-muted-foreground"
            />
          </Button>
        </div>
      </div>
    </div>

    <div class="w-full h-full overflow-y-auto">
      <!-- TODO: add move able file/ folder ,  -->
      <!-- TODO: check function of menu context for 3 case : [file, folder, root]  -->
      <!-- TODO: control file content / persist / restore  -->
      <!-- TODO: save state search / expanded state  -->
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
            v-model:explorerFiles="mappedExplorerFiles"
            v-model:expandedState="expandedState"
            v-model:selectedItems="selectedItems"
            is-show-arrow
            :onRightClickItem="onRightClickItem"
            v-on:clickTreeItem="
              (_, item) => {
                if (item.hasChildren) {
                  return;
                }

                tabViewStore.openTab({
                  icon: item.value.icon,
                  id: item.value.title,
                  name: item.value.title,
                  type: TabViewType.CodeQuery,
                  routeName: 'workspaceId-explorer-fileId',
                  routeParams: {
                    fileId: item.value.id,
                  },
                  connectionId: connectionId,
                  schemaId: schemaId || '',
                  workspaceId: workspaceId,
                  tableName: item.value.title,
                });

                tabViewStore.selectTab(item.value.id);
              }
            "
          >
            <template #edit-inline="{ item }">
              <TreeItemInputEditInline
                ref="editFileNameInline"
                @rename="
                  name => {
                    onReNameFile(item as FlattenedTreeFileSystemItem, name);
                  }
                "
                @cancel-create="
                  () => {
                    onRemoveItemByPaths(item as FlattenedTreeFileSystemItem);
                  }
                "
                :validate-name="
                  name => {
                    const flattenedFileNames = (
                      (
                        (item as FlattenedTreeFileSystemItem).parentItem
                          ?.children || explorerFiles
                      )?.map(e => e.title) ?? []
                    ).filter(e => e !== item.value.title);

                    return flattenedFileNames.includes(name);
                  }
                "
                :id="item._id"
              />
            </template>

            <!-- <template #extra-actions="{ item }">
            <div class="flex items-center">
              <Button
                size="iconSm"
                class="hover:bg-background/80!"
                variant="ghost"
                @click.stop="
                  () => {
                    onAddNewItem({
                      paths: item.value.paths,
                      isFolder: false,
                    });
                  }
                "
                v-if="item.hasChildren"
              >
                <Icon
                  name="lucide:file-plus-2"
                  class="size-4! min-w-4 text-muted-foreground"
                />
              </Button>

              <Button
                size="iconSm"
                variant="ghost"
                class="hover:bg-background/80!"
                @click.stop="
                  () => {
                    onAddNewItem({
                      paths: item.value.paths,
                      isFolder: true,
                    });
                  }
                "
                v-if="item.hasChildren"
              >
                <Icon
                  name="lucide:folder-plus"
                  class="size-4! min-w-4 text-muted-foreground"
                />
              </Button>
              <Button
                size="iconSm"
                class="hover:bg-background/80!"
                variant="ghost"
                @click.stop="
                  () => {
                    onSetAllowEditFileName(item);
                  }
                "
              >
                <Icon
                  name="lucide:pencil"
                  class="size-4! min-w-4 text-muted-foreground"
                />
              </Button>
              <Button
                size="iconSm"
                class="hover:bg-background/80!"
                variant="ghost"
                @click.stop="() => onRemoveFile(item)"
              >
                <Icon
                  name="lucide:trash"
                  class="size-4! min-w-4 text-muted-foreground"
                />
              </Button>
            </div>
          </template> -->
          </TreeFolder>
        </ContextMenuTrigger>

        <ContextMenuContent class="w-56">
          <ContextMenuItem
            @select="
              () => {
                onDelayedCallback(() => {
                  rightClickSelectedItem &&
                    onAddNewItem({
                      paths: rightClickSelectedItem.value.paths,
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
                      paths: rightClickSelectedItem.value.paths,
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
                onRemoveItemByPaths(rightClickSelectedItem)
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
