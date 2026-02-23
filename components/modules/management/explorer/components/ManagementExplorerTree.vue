<script setup lang="ts">
import BaseContextMenu from '~/components/base/context-menu/BaseContextMenu.vue';
import type { ContextMenuItem } from '~/components/base/context-menu/menuContext.type';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type {
  DropPosition,
  FileNode,
  TreePersistenceExtension,
} from '~/components/base/tree-folder/types';

interface Props {
  treeData: Record<string, FileNode>;
  storageKey: string;
  persistenceExtension?: TreePersistenceExtension;
  contextMenuItems: ContextMenuItem[];
  validateRename: (nodeId: string, newName: string) => true | string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'click-node', nodeId: string): void;
  (e: 'rename-node', nodeId: string, newName: string): void;
  (e: 'cancel-rename', nodeId: string): void;
  (e: 'context-node', nodeId: string): void;
  (
    e: 'move-node',
    movedNodeIds: string | string[],
    targetId: string,
    position: DropPosition
  ): void;
  (e: 'select-node', nodeIds: string[]): void;
  (e: 'clear-context-menu'): void;
}>();

const fileTreeRef = useTemplateRef<typeof FileTree | null>('fileTreeRef');

const startEditing = (nodeId: string) => {
  fileTreeRef.value?.startEditing(nodeId);
};

const focusItem = (nodeId: string) => {
  fileTreeRef.value?.focusItem(nodeId);
};

const collapseAll = () => {
  fileTreeRef.value?.collapseAll();
};

const expandAll = () => {
  fileTreeRef.value?.expandAll();
};

const clearSelection = () => {
  fileTreeRef.value?.clearSelection();
};

const isMouseInside = computed(() => fileTreeRef.value?.isMouseInside ?? false);

defineExpose({
  startEditing,
  focusItem,
  collapseAll,
  expandAll,
  clearSelection,
  isMouseInside,
});
</script>

<template>
  <div class="w-full h-full overflow-y-auto">
    <BaseContextMenu
      :context-menu-items="contextMenuItems"
      @on-clear-context-menu="emit('clear-context-menu')"
    >
      <div class="h-full">
        <FileTree
          ref="fileTreeRef"
          class="pt-1"
          :initial-data="treeData"
          :allow-drag-and-drop="true"
          :allow-sort="false"
          :validate-rename="validateRename"
          :storage-key="storageKey"
          :persistence-extension="props.persistenceExtension"
          @click="nodeId => emit('click-node', nodeId)"
          @rename="(nodeId, newName) => emit('rename-node', nodeId, newName)"
          @cancel-rename="nodeId => emit('cancel-rename', nodeId)"
          @contextmenu="nodeId => emit('context-node', nodeId)"
          @select="nodeIds => emit('select-node', nodeIds)"
          @move="
            (movedNodeIds, targetId, position) =>
              emit('move-node', movedNodeIds, targetId, position)
          "
        />
      </div>
    </BaseContextMenu>
  </div>
</template>
