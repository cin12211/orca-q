<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { useCurrentWorkspaceId } from '~/shared/contexts/useGetWorkspaceId';
import {
  TabViewType,
  useManagementViewContainerStore,
} from '~/shared/stores/useManagementViewContainerStore';
import { useManagementExplorerStore } from '../../../shared/stores/managementExplorerStore';
import InputEditInline from './InputEditInline.vue';
import TreeFolder from './TreeFolder.vue';
import {
  ETreeFileSystemStatus,
  getTreeItemPath,
  tree,
  type FlattenedTreeFileSystemItem,
} from './treeUtils';

const explorerStore = useManagementExplorerStore();
const { expandedState, explorerFiles } = toRefs(explorerStore);

const rightClickSelectedItem = ref<FlattenedTreeFileSystemItem | null>(null);

const editFileNameInlineRef = useTemplateRef<InstanceType<
  typeof InputEditInline
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
  await nextTick();

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

  editFileNameInlineRef.value?.$el?.focus();

  if (editFileNameInlineRef.value) {
    editFileNameInlineRef.value.inputValue = fileInfo.value.title;
  }
};

const onRightClickItem = (_: MouseEvent, item: FlattenedTreeFileSystemItem) => {
  rightClickSelectedItem.value = item;
};

const onDelayedCallback = (callBack: () => void) => {
  setTimeout(async () => {
    callBack();
  }, 100);
};

const tabsStore = useManagementViewContainerStore();
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <div class="relative w-full items-center px-3 pt-2">
      <div class="relative w-full">
        <Input
          type="text"
          placeholder="Search in all tables or functions"
          class="pl-2 w-full h-8"
        />
      </div>
    </div>

    <div class="px-3 pr-2 pt-2 flex items-center justify-between">
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
            icon="lucide:file-plus-2"
            class="size-4! min-w-4 text-muted-foreground"
          />
        </Button>

        <Button
          size="iconSm"
          variant="ghost"
          @click="() => onAddNewItem({ isFolder: true })"
        >
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

    <div class="w-full h-full overflow-y-auto">
      <ContextMenu>
        <ContextMenuTrigger>
          <TreeFolder
            v-model:explorerFiles="explorerFiles"
            v-model:expandedState="expandedState"
            is-show-arrow
            :onRightClickItem="onRightClickItem"
            v-on:clickTreeItem="
              (_, item) => {
                if (item.hasChildren) {
                  return;
                }

                tabsStore.openTab({
                  icon: item.value.icon,
                  id: item.value.id,
                  name: item.value.title,
                  type: TabViewType.CodeQuery,
                  routeName: 'workspaceId-explorer-fileId',
                  routeParams: {
                    fileId: item.value.id,
                  },
                });

                tabsStore.selectTab(item.value.id);
              }
            "
          >
            <template #edit-inline="{ item }">
              <InputEditInline
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
                  icon="lucide:file-plus-2"
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
                  icon="lucide:folder-plus"
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
                  icon="lucide:pencil"
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
                  icon="lucide:trash"
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
            v-if="rightClickSelectedItem?.hasChildren"
          >
            <Icon
              icon="lucide:file-plus-2"
              class="size-4! min-w-4 text-muted-foreground"
            />
            Add new file
          </ContextMenuItem>
          <ContextMenuItem
            v-if="rightClickSelectedItem?.hasChildren"
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
              icon="lucide:folder-plus"
              class="size-4! min-w-4 text-muted-foreground"
            />
            Add new folder
          </ContextMenuItem>

          <ContextMenuItem
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
              icon="lucide:pencil"
              class="size-4! min-w-4 text-muted-foreground"
            />
            Rename...
          </ContextMenuItem>
          <ContextMenuItem
            variant="destructive"
            @click.stop="
              () =>
                rightClickSelectedItem &&
                onRemoveItemByPaths(rightClickSelectedItem)
            "
          >
            <Icon
              icon="lucide:trash"
              class="size-4! min-w-4 text-muted-foreground"
            />Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  </div>
</template>
