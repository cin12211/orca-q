<script setup lang="ts">
import TreeRow from './TreeRow.vue';
import {
  useTreeNodes,
  useTreeVirtualizer,
  useTreeSelection,
  useTreeDragDrop,
  useTreeRename,
  useTreeKeyboardNav,
  useTreeFocusItem,
} from './hooks';
import { createTreePersistencePlugin } from './plugins/tree-persistence';
import type { FileNode, TreePersistenceExtension } from './types';

interface Props {
  initExpandedIds?: string[];
  initialData?: Record<string, FileNode>;
  validateRename?: (nodeId: string, newName: string) => string | true;
  storageKey?: string;
  allowSort?: boolean; // Allow reordering items (before/after positions)
  allowDragAndDrop?: boolean; // Allow any drag and drop (including nesting)
  itemHeight?: number;
  indentSize?: number;
  baseIndent?: number;
  autoExpandDelay?: number;
  delayFocus?: number;
  autoScrollThreshold?: number;
  autoScrollSpeed?: number;
  overscan?: number;
  persistenceExtension?: TreePersistenceExtension;
  searchQuery?: string;
  autoExpandOnSearch?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  storageKey: 'vscode_tree_state',
  allowSort: false, // By default, only allow moving into folders
  allowDragAndDrop: true,
  itemHeight: 24,
  indentSize: 20,
  baseIndent: 8,
  autoExpandDelay: 100,
  delayFocus: 50,
  autoScrollThreshold: 50,
  autoScrollSpeed: 10,
  overscan: 10,
  searchQuery: '',
  autoExpandOnSearch: true,
  persistenceExtension: () =>
    createTreePersistencePlugin({
      mode: 'web',
      pushDebounceMs: 400,
    }),
});

const emit = defineEmits<{
  move: [
    nodeId: string | string[], // Single nodeId or array for multi-select
    targetId: string,
    position: 'before' | 'after' | 'inside',
  ];
  select: [nodeIds: string[]];
  click: [nodeId: string, event: MouseEvent];
  contextmenu: [nodeId: string, event: MouseEvent];
  rename: [nodeId: string, newName: string];
  'cancel-rename': [nodeId: string];
  delete: [nodeId: string, event: KeyboardEvent];
}>();

const {
  nodes,
  expandedIds,
  visibleNodeIds,
  toggleExpansion,
  expandAll,
  collapseAll,
  isExpandedAll,
} = useTreeNodes(props);

const { parentRef, isMouseInside, rowVirtualizer, scrollToItem } =
  useTreeVirtualizer(props, visibleNodeIds);

const {
  selectedIds,
  focusedId,
  handleRowClick,
  handleRowDblClick,
  handleContextMenu,
  handleBackgroundClick,
  clearSelection,
} = useTreeSelection(emit, { nodes, visibleNodeIds, toggleExpansion });

const {
  dropIndicator,
  isDragging,
  overlayFolderId,
  overlayPosition,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDragEnd,
  handleDrop,
} = useTreeDragDrop(props, emit, {
  nodes,
  expandedIds,
  visibleNodeIds,
  selectedIds,
  parentRef,
});

const {
  editingId,
  renameErrors,
  errorTooltipPosition,
  handleRename,
  handleCancelRename,
  handleEditingChange,
  startEditing,
} = useTreeRename(props, emit, { nodes, visibleNodeIds });

const { handleKeyDown } = useTreeKeyboardNav(emit, {
  nodes,
  expandedIds,
  visibleNodeIds,
  focusedId,
  toggleExpansion,
  scrollToItem,
});

const { focusItem } = useTreeFocusItem(props, emit, {
  nodes,
  expandedIds,
  visibleNodeIds,
  focusedId,
  selectedIds,
  scrollToItem,
});

defineExpose({
  expandAll,
  collapseAll,
  focusItem,
  clearSelection,
  startEditing,
  isMouseInside,
  isExpandedAll,
});
</script>

<template>
  <div
    ref="parentRef"
    @mouseenter="isMouseInside = true"
    @mouseleave="isMouseInside = false"
    class="file-tree"
    tabindex="0"
    @keydown="handleKeyDown"
    @click="handleBackgroundClick"
  >
    <div
      :style="{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }"
    >
      <div
        v-for="item in rowVirtualizer.getVirtualItems()"
        :key="String(item.key)"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${item.size}px`,
          transform: `translateY(${item.start}px)`,
        }"
      >
        <TreeRow
          v-memo="[
            nodes[visibleNodeIds[item.index]],
            selectedIds.has(visibleNodeIds[item.index]),
            expandedIds.has(visibleNodeIds[item.index]),
            focusedId === visibleNodeIds[item.index],
            editingId === visibleNodeIds[item.index],
            !overlayFolderId &&
            dropIndicator?.nodeId === visibleNodeIds[item.index]
              ? dropIndicator
              : null,
            props.itemHeight,
            props.indentSize,
            props.baseIndent,
            props.allowDragAndDrop,
            renameErrors[visibleNodeIds[item.index]],
          ]"
          :node="nodes[visibleNodeIds[item.index]]"
          :is-selected="selectedIds.has(visibleNodeIds[item.index])"
          :is-expanded="expandedIds.has(visibleNodeIds[item.index])"
          :is-focused="focusedId === visibleNodeIds[item.index]"
          :is-editing="editingId === visibleNodeIds[item.index]"
          :rename-error="renameErrors[visibleNodeIds[item.index]] || ''"
          :drop-indicator="
            !overlayFolderId &&
            dropIndicator?.nodeId === visibleNodeIds[item.index]
              ? dropIndicator
              : null
          "
          :item-height="props.itemHeight"
          :indent-size="props.indentSize"
          :base-indent="props.baseIndent"
          :allow-drag-and-drop="props.allowDragAndDrop"
          @click="handleRowClick($event, visibleNodeIds[item.index])"
          @dblclick="handleRowDblClick(visibleNodeIds[item.index])"
          @toggle="toggleExpansion(visibleNodeIds[item.index])"
          @dragstart="handleDragStart($event, visibleNodeIds[item.index])"
          @dragover="handleDragOver($event, visibleNodeIds[item.index])"
          @dragleave="handleDragLeave"
          @dragend="handleDragEnd"
          @drop="handleDrop($event, visibleNodeIds[item.index])"
          @contextmenu="handleContextMenu($event, visibleNodeIds[item.index])"
          @rename="handleRename(visibleNodeIds[item.index], $event)"
          @editing-change="
            handleEditingChange(visibleNodeIds[item.index], $event)
          "
          @cancel-rename="handleCancelRename(visibleNodeIds[item.index])"
        >
          <!-- Pass through action slot -->
          <template #actions="{ node }">
            <slot name="actions" :node="node" />
          </template>
          <!-- Pass through always-visible meta slot -->
          <template #meta="{ node }">
            <slot name="meta" :node="node" />
          </template>
        </TreeRow>
      </div>

      <!-- Rename error tooltip overlay (positioned like drop overlay) -->
      <Transition name="tree-error">
        <div
          v-if="errorTooltipPosition"
          :id="`rename-error-${editingId}`"
          class="flex items-start gap-1 text-xs font-normal pointer-events-none text-muted-foreground z-30 whitespace-break-spaces px-1 py-2 shadow-md border border-destructive border-l-[3px] rounded-md bg-popover"
          :style="{
            position: 'absolute',
            top: `${errorTooltipPosition.top}px`,
            left: `${errorTooltipPosition.left}px`,
            right: '8px',
          }"
          role="alert"
          aria-live="assertive"
        >
          <Icon
            name="lucide:alert-circle"
            class="text-destructive size-4!"
            aria-hidden="true"
          />
          {{ errorTooltipPosition.message }}
        </div>
      </Transition>

      <!-- Unified folder drop overlay -->
      <div
        v-if="overlayPosition && isDragging"
        class="tree-drop-overlay"
        :style="{
          position: 'absolute',
          top: `${overlayPosition.top}px`,
          left: 0,
          width: '100%',
          height: `${overlayPosition.height}px`,
        }"
      />
    </div>
  </div>
</template>

<style scoped>
/* 
 * File Tree Component Styles
 * Uses CSS variables from your design system for easy theming
 * Customize by overriding these CSS variables:
 * - --v-tree-scrollbar-thumb
 * - --v-tree-scrollbar-thumb-hover
 * - --v-tree-scrollbar-track
 */

.file-tree {
  height: 100%;
  width: 100%;
  overflow: auto;
  outline: none;
  contain: strict;
  content-visibility: auto;
  background-color: var(--v-tree-bg, transparent);
  color: var(--v-tree-text, hsl(var(--foreground)));
}

/* .file-tree::-webkit-scrollbar {
  width: var(--v-tree-scrollbar-width, 10px);
  height: var(--v-tree-scrollbar-height, 10px);
}

.file-tree::-webkit-scrollbar-thumb {
  background-color: var(--v-tree-scrollbar-thumb, oklch(0.556 0 0 / 0.3));
  border-radius: 99px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.file-tree::-webkit-scrollbar-thumb:hover {
  background-color: var(--v-tree-scrollbar-thumb-hover, oklch(0.556 0 0 / 0.5));
}

.file-tree::-webkit-scrollbar-track {
  background-color: var(--v-tree-scrollbar-track, transparent);
} */

/* Unified folder drop overlay */
.tree-drop-overlay {
  pointer-events: none;
  z-index: 5;
  border-radius: var(--radius-sm, 4px);
  background-color: var(--v-tree-drop-overlay-bg, hsl(var(--primary) / 0.06));
  border: 1px solid var(--v-tree-drop-overlay-border, hsl(var(--primary) / 0.3));
  transition:
    top 0.12s ease,
    height 0.12s ease;
}

/* Error tooltip transition */
.tree-error-enter-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.tree-error-leave-active {
  transition:
    opacity 0.1s ease,
    transform 0.1s ease;
}

.tree-error-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.tree-error-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
