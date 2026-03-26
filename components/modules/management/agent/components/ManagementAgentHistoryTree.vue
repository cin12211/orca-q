<script setup lang="ts">
import BaseContextMenu from '~/components/base/context-menu/BaseContextMenu.vue';
import type { ContextMenuItem } from '~/components/base/context-menu/menuContext.type';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';

defineProps<{
  contextMenuItems: ContextMenuItem[];
  historySectionId: string;
  storageKey: string;
  treeData: Record<string, FileNode>;
  initExpandedIds: string[];
  validateRename?: (nodeId: string, newName: string) => true | string;
}>();

const emit = defineEmits<{
  (e: 'clear-context-menu'): void;
  (e: 'click-node', nodeId: string): void;
  (e: 'context-node', nodeId: string): void;
  (e: 'delete-history', nodeId: string): void;
  (e: 'rename-history', nodeId: string, newName: string): void;
  (e: 'cancel-rename', nodeId: string): void;
  (e: 'new-thread'): void;
}>();

const treeRef = useTemplateRef<InstanceType<typeof FileTree> | null>('treeRef');

defineExpose({
  clearSelection: () => treeRef.value?.clearSelection(),
  collapseAll: () => treeRef.value?.collapseAll(),
  expandAll: () => treeRef.value?.expandAll(),
  focusItem: (nodeId: string) => treeRef.value?.focusItem(nodeId),
  startEditing: (nodeId: string) => treeRef.value?.startEditing(nodeId),
  get isExpandedAll() {
    return treeRef.value?.isExpandedAll ?? false;
  },
  get isMouseInside() {
    return treeRef.value?.isMouseInside ?? false;
  },
});
</script>

<template>
  <div class="h-full w-full overflow-y-auto">
    <BaseContextMenu
      :context-menu-items="contextMenuItems"
      @on-clear-context-menu="emit('clear-context-menu')"
    >
      <div class="h-full">
        <FileTree
          ref="treeRef"
          class="pt-1"
          :storage-key="storageKey"
          :initial-data="treeData"
          :init-expanded-ids="initExpandedIds"
          :allow-drag-and-drop="false"
          :allow-sort="false"
          :validate-rename="validateRename"
          @click="nodeId => emit('click-node', nodeId)"
          @contextmenu="nodeId => emit('context-node', nodeId)"
          @rename="(nodeId, newName) => emit('rename-history', nodeId, newName)"
          @cancel-rename="nodeId => emit('cancel-rename', nodeId)"
        >
          <template #actions="{ node }">
            <Tooltip v-if="node.id === historySectionId">
              <TooltipTrigger as-child>
                <Button
                  size="iconSm"
                  variant="ghost"
                  @click.stop="emit('new-thread')"
                >
                  <Icon name="hugeicons:plus-sign" class="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent> New thread </TooltipContent>
            </Tooltip>

            <div
              v-else-if="node.id.startsWith('agent-history-')"
              class="flex items-center"
            >
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    size="iconSm"
                    variant="outline"
                    class="text-muted-foreground hover:text-primary"
                    @click.stop="treeRef?.startEditing(node.id)"
                  >
                    <Icon name="hugeicons:edit-02" class="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent> Rename thread </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    size="iconSm"
                    variant="ghost"
                    class="text-muted-foreground hover:text-destructive"
                    @click.stop="emit('delete-history', node.id)"
                  >
                    <Icon name="hugeicons:delete-02" class="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent> Delete thread </TooltipContent>
              </Tooltip>
            </div>
          </template>
        </FileTree>
      </div>
    </BaseContextMenu>
  </div>
</template>
