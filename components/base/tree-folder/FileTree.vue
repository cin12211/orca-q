<script setup lang="ts">
import { ref, computed, watch, onMounted, shallowRef, h, render } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';
import PseudomorphismDragItem from './PseudomorphismDragItem.vue';
import TreeRow from './TreeRow.vue';
import type { FileNode, DropIndicator, DragData } from './types';

interface Props {
  initExpandedIds?: string[];
  initialData?: Record<string, FileNode>;
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
}>();

// Core state - use shallowRef for performance with large datasets
const nodes = shallowRef<Record<string, FileNode>>({});
const expandedIds = ref<Set<string>>(new Set(props.initExpandedIds || []));
const selectedIds = ref<Set<string>>(new Set());
const focusedId = ref<string | null>(null);
const editingId = ref<string | null>(null);

// Root node IDs (nodes with parentId === null)
const rootIds = computed(() =>
  Object.values(nodes.value)
    .filter(node => node.parentId === null)
    .map(node => node.id)
);

// Flatten the tree based on expansion state
const visibleNodeIds = computed(() => {
  const result: string[] = [];

  const traverse = (ids: string[]) => {
    for (const id of ids) {
      result.push(id);
      const node = nodes.value[id];
      if (
        node.children &&
        node.children.length > 0 &&
        expandedIds.value.has(id)
      ) {
        traverse(node.children);
      }
    }
  };

  traverse(rootIds.value);
  return result;
});

// Virtualization setup
const parentRef = useTemplateRef<HTMLElement | null>('parentRef');
const isMouseInside = ref(false);

const rowVirtualizer = useVirtualizer({
  get count() {
    return visibleNodeIds.value.length;
  },
  getScrollElement: () => parentRef.value,
  estimateSize: () => props.itemHeight,
  overscan: props.overscan,
});

// Drag and drop state
const draggedId = ref<string | null>(null);
const dropIndicator = ref<DropIndicator | null>(null);
const autoExpandTimer = ref<any>(null);
const lastHoverId = ref<string | null>(null);
const autoScrollInterval = ref<any>(null);
const isDragging = ref(false);
const overlayFolderId = ref<string | null>(null);

// Overlay position — computed from the folder's index and its last visible descendant
const overlayPosition = computed(() => {
  if (!overlayFolderId.value || !isDragging.value) return null;

  const folderId = overlayFolderId.value;
  const folderIndex = visibleNodeIds.value.indexOf(folderId);
  if (folderIndex === -1) return null;

  const folder = nodes.value[folderId];
  if (!folder) return null;

  // Descendants are contiguous in DFS order — walk forward while depth > folder.depth
  let lastIndex = folderIndex;
  for (let i = folderIndex + 1; i < visibleNodeIds.value.length; i++) {
    const node = nodes.value[visibleNodeIds.value[i]];
    if (node.depth > folder.depth) {
      lastIndex = i;
    } else {
      break;
    }
  }

  return {
    top: folderIndex * props.itemHeight,
    height: (lastIndex - folderIndex + 1) * props.itemHeight,
  };
});

// Toggle expansion
const toggleExpansion = (nodeId: string) => {
  if (expandedIds.value.has(nodeId)) {
    expandedIds.value.delete(nodeId);
  } else {
    expandedIds.value.add(nodeId);
  }
  // Trigger reactivity
  expandedIds.value = new Set(expandedIds.value);
};

// Selection handlers
const handleRowClick = (event: MouseEvent, nodeId: string) => {
  if (event.ctrlKey || event.metaKey) {
    // Multi-select toggle
    if (selectedIds.value.has(nodeId)) {
      selectedIds.value.delete(nodeId);
    } else {
      selectedIds.value.add(nodeId);
    }
    selectedIds.value = new Set(selectedIds.value);
  } else if (event.shiftKey && focusedId.value) {
    // Range select
    const startIdx = visibleNodeIds.value.indexOf(focusedId.value);
    const endIdx = visibleNodeIds.value.indexOf(nodeId);
    const [from, to] =
      startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];

    selectedIds.value = new Set(visibleNodeIds.value.slice(from, to + 1));
  } else {
    // Single select
    selectedIds.value = new Set([nodeId]);
  }

  focusedId.value = nodeId;
  emit('select', Array.from(selectedIds.value));

  if (event.type === 'click') {
    emit('click', nodeId, event);
  }
};

const handleRowDblClick = (nodeId: string) => {
  const node = nodes.value[nodeId];
  if (node.type === 'folder') {
    toggleExpansion(nodeId);
  }
};

// Drag handlers
const handleDragStart = (event: DragEvent, nodeId: string) => {
  if (!props.allowDragAndDrop) {
    event.preventDefault();
    return;
  }

  draggedId.value = nodeId;
  isDragging.value = true;
  const node = nodes.value[nodeId];

  // Check if dragging a multi-selection
  const isMultiDrag =
    selectedIds.value.has(nodeId) && selectedIds.value.size > 1;
  const draggedNodes = isMultiDrag ? Array.from(selectedIds.value) : [nodeId];

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    const dragData: DragData = {
      nodeId,
      node,
      selectedNodeIds: isMultiDrag ? draggedNodes : undefined,
    };
    event.dataTransfer.setData('application/json', JSON.stringify(dragData));

    // Create custom drag image (for both single and multi-select)
    const dragPreview = createDragPreview(
      draggedNodes.length,
      node.name,
      node.type
    );
    document.body.appendChild(dragPreview);
    event.dataTransfer.setDragImage(dragPreview, 20, 20);

    // Clean up after drag starts
    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);
  }
};

// Create custom drag preview element using Vue's h() render function
const createDragPreview = (
  count: number,
  itemName: string,
  itemType: 'file' | 'folder'
): HTMLElement => {
  // Create container element
  const container = document.createElement('div');

  // Create VNode using h() with PseudomorphismDragItem component
  const vnode = h(PseudomorphismDragItem, {
    count,
    itemName,
    itemType,
  });

  // Render VNode to container
  render(vnode, container);

  // Return the first child element (the actual drag preview)
  return container.firstElementChild as HTMLElement;
};

// Auto-scroll when dragging near edges
const handleAutoScroll = (event: DragEvent) => {
  if (!parentRef.value || !isDragging.value) return;

  const container = parentRef.value;
  const rect = container.getBoundingClientRect();
  const scrollThreshold = props.autoScrollThreshold; // pixels from edge to trigger scroll
  const scrollSpeed = props.autoScrollSpeed; // pixels to scroll per interval

  const mouseY = event.clientY - rect.top;
  const containerHeight = rect.height;

  // Clear existing interval
  if (autoScrollInterval.value) {
    clearInterval(autoScrollInterval.value);
    autoScrollInterval.value = null;
  }

  // Scroll up when near top
  if (mouseY < scrollThreshold && mouseY > 0) {
    autoScrollInterval.value = setInterval(() => {
      if (container.scrollTop > 0) {
        container.scrollTop -= scrollSpeed;
      }
    }, 16); // ~60fps
  }
  // Scroll down when near bottom
  else if (
    mouseY > containerHeight - scrollThreshold &&
    mouseY < containerHeight
  ) {
    autoScrollInterval.value = setInterval(() => {
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (container.scrollTop < maxScroll) {
        container.scrollTop += scrollSpeed;
      }
    }, 16); // ~60fps
  }
};

// Check if nodeId is a descendant of potentialAncestorId
// Walks up the tree via parentId — prevents dropping a parent into its own subtree
const isDescendantOf = (
  nodeId: string,
  potentialAncestorId: string
): boolean => {
  let currentId: string | null = nodeId;
  while (currentId) {
    if (currentId === potentialAncestorId) return true;
    currentId = nodes.value[currentId]?.parentId ?? null;
  }
  return false;
};

const calculateDropPosition = (
  event: DragEvent,
  nodeId: string
): 'before' | 'after' | 'inside' => {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const height = rect.height;

  const node = nodes.value[nodeId];

  // If sorting is disabled, only allow 'inside' position
  // This works for both folders (drop inside) and files (will drop into parent folder)
  if (!props.allowSort) {
    return 'inside';
  }

  // If sorting is enabled, calculate position based on mouse
  // If it's a folder and mouse is in the middle 60%, drop inside
  if (node.type === 'folder' && y > height * 0.2 && y < height * 0.8) {
    return 'inside';
  }

  // Otherwise, drop before/after
  return y < height / 2 ? 'before' : 'after';
};

const handleDragOver = (event: DragEvent, nodeId: string) => {
  event.preventDefault();

  if (!props.allowDragAndDrop) return;

  if (!draggedId.value || draggedId.value === nodeId) {
    return;
  }

  const node = nodes.value[nodeId];

  // Handle auto-scroll
  handleAutoScroll(event);

  // Resolve the target folder for the overlay
  // - Hovering a folder → target is that folder
  // - Hovering a file → target is the parent folder
  let targetFolderId: string | null = null;
  if (node.type === 'folder') {
    targetFolderId = nodeId;
  } else if (node.parentId) {
    targetFolderId = node.parentId;
  }

  // Prevent dropping into the dragged item itself or its descendant
  if (
    targetFolderId === draggedId.value ||
    (targetFolderId && isDescendantOf(targetFolderId, draggedId.value))
  ) {
    overlayFolderId.value = null;
    dropIndicator.value = null;
    return;
  }

  // Set overlay folder
  if (targetFolderId) {
    overlayFolderId.value = targetFolderId;
    // Set dropIndicator for internal drop handling
    dropIndicator.value = { nodeId: targetFolderId, position: 'inside' };
  }

  // For folders with sorting enabled, also calculate before/after positions
  if (props.allowSort && node.type === 'folder') {
    const position = calculateDropPosition(event, nodeId);
    if (position !== 'inside') {
      // Show line indicator instead of overlay
      overlayFolderId.value = null;
      dropIndicator.value = { nodeId, position };
    }
  }

  // Auto-expand logic — keyed on target folder
  const autoExpandTarget = targetFolderId || nodeId;
  if (autoExpandTarget !== lastHoverId.value) {
    clearTimeout(autoExpandTimer.value);
    lastHoverId.value = autoExpandTarget;

    const targetNode = nodes.value[autoExpandTarget];
    if (
      targetNode?.type === 'folder' &&
      !expandedIds.value.has(autoExpandTarget)
    ) {
      autoExpandTimer.value = setTimeout(() => {
        if (lastHoverId.value === autoExpandTarget && isDragging.value) {
          expandedIds.value.add(autoExpandTarget);
          expandedIds.value = new Set(expandedIds.value);
        }
      }, props.autoExpandDelay);
    }
  }
};

const handleDragLeave = () => {
  // Don't clear on every drag leave, only when actually leaving
  // This prevents flickering during drag operations
};

const handleDragEnd = () => {
  // Clean up all drag state
  clearTimeout(autoExpandTimer.value);
  if (autoScrollInterval.value) {
    clearInterval(autoScrollInterval.value);
    autoScrollInterval.value = null;
  }
  isDragging.value = false;
  draggedId.value = null;
  dropIndicator.value = null;
  lastHoverId.value = null;
  overlayFolderId.value = null;
};

const handleDrop = (event: DragEvent, targetId: string) => {
  event.preventDefault();

  if (!props.allowDragAndDrop) return;

  clearTimeout(autoExpandTimer.value);
  if (autoScrollInterval.value) {
    clearInterval(autoScrollInterval.value);
    autoScrollInterval.value = null;
  }

  if (!draggedId.value) {
    handleDragEnd();
    return;
  }

  // Determine what's being dragged (single or multi-select)
  let draggedItems: string[];
  try {
    const dataStr = event.dataTransfer?.getData('application/json');
    if (dataStr) {
      const dragData: DragData = JSON.parse(dataStr);
      draggedItems = dragData.selectedNodeIds || [dragData.nodeId];
    } else {
      draggedItems = [draggedId.value];
    }
  } catch {
    draggedItems = [draggedId.value];
  }

  // When overlay is active, use the overlay folder as the effective drop target
  const effectiveTargetId = overlayFolderId.value || targetId;
  const effectivePosition: 'before' | 'after' | 'inside' = overlayFolderId.value
    ? 'inside'
    : dropIndicator.value?.position || 'inside';

  // Prevent dropping an item onto itself or into its own subtree
  if (
    draggedItems.includes(effectiveTargetId) ||
    draggedItems.some(id => isDescendantOf(effectiveTargetId, id))
  ) {
    console.warn('Cannot drop item onto itself or into its own subtree');
    handleDragEnd();
    return;
  }

  // When sorting is disabled — always drop 'inside' the resolved folder
  if (!props.allowSort) {
    emit(
      'move',
      draggedItems.length === 1 ? draggedItems[0] : draggedItems,
      effectiveTargetId,
      'inside'
    );
    handleDragEnd();
    return;
  }

  // Sorting enabled — allow all positions
  emit(
    'move',
    draggedItems.length === 1 ? draggedItems[0] : draggedItems,
    effectiveTargetId,
    effectivePosition
  );

  // Reset state
  handleDragEnd();
};

// Scroll focused item into view
const scrollToItem = (nodeId: string) => {
  if (!parentRef.value) return;

  const index = visibleNodeIds.value.indexOf(nodeId);
  if (index === -1) return;

  // Use the virtualizer to scroll to the item
  rowVirtualizer.value.scrollToIndex(index, {
    align: 'center',
    behavior: 'auto',
  });
};

// Keyboard navigation
const handleKeyDown = (event: KeyboardEvent) => {
  if (!focusedId.value) return;

  const currentIdx = visibleNodeIds.value.indexOf(focusedId.value);
  if (currentIdx === -1) return;

  let newIdx = currentIdx;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      newIdx = Math.min(currentIdx + 1, visibleNodeIds.value.length - 1);
      break;

    case 'ArrowUp':
      event.preventDefault();
      newIdx = Math.max(currentIdx - 1, 0);
      break;

    case 'ArrowRight': {
      event.preventDefault();
      const node = nodes.value[focusedId.value];
      if (node.type === 'folder') {
        if (!expandedIds.value.has(focusedId.value)) {
          toggleExpansion(focusedId.value);
        } else {
          // Move to first child
          newIdx = currentIdx + 1;
        }
      }
      break;
    }

    case 'ArrowLeft': {
      event.preventDefault();
      const node = nodes.value[focusedId.value];
      if (node.type === 'folder' && expandedIds.value.has(focusedId.value)) {
        toggleExpansion(focusedId.value);
      } else if (node.parentId) {
        // Move to parent
        newIdx = visibleNodeIds.value.indexOf(node.parentId);
      }
      break;
    }

    case 'Enter':
    case ' ':
      event.preventDefault();
      const node = nodes.value[focusedId.value];
      if (node.type === 'folder') {
        toggleExpansion(focusedId.value);
      }
      break;
  }

  if (newIdx !== currentIdx) {
    focusedId.value = visibleNodeIds.value[newIdx];
    // if (!event.shiftKey) {
    //   selectedIds.value = new Set([focusedId.value]);
    //   emit('select', [focusedId.value]);
    // }

    // Scroll focused item into view
    scrollToItem(focusedId.value);
  }
};

// Context menu handler
const handleContextMenu = (event: MouseEvent, nodeId: string) => {
  handleRowClick(event, nodeId);
  emit('contextmenu', nodeId, event);
};

// Rename handlers
const handleRename = (nodeId: string, newName: string) => {
  editingId.value = null;
  emit('rename', nodeId, newName);
};

const handleCancelRename = () => {
  editingId.value = null;
};

// Public method to start editing
const startEditing = (nodeId: string) => {
  editingId.value = nodeId;
};

// Persistence
watch(
  () => Array.from(expandedIds.value),
  newVal => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `${props.storageKey}_expanded`,
        JSON.stringify(newVal)
      );
    }
  }
);

// Initialization
onMounted(() => {
  // Load data
  if (props.initialData) {
    nodes.value = props.initialData;
  }

  // Load expansion state
  if (typeof window !== 'undefined') {
    const savedState = localStorage.getItem(`${props.storageKey}_expanded`);
    if (savedState) {
      try {
        const ids = JSON.parse(savedState);
        expandedIds.value = new Set(ids);
      } catch (e) {
        console.error('Failed to load tree state', e);
      }
    }
  }

  // Set initial focus
  // if (visibleNodeIds.value.length > 0) {
  //   focusedId.value = visibleNodeIds.value[0];
  // }
});

// React to external data changes
watch(
  () => props.initialData,
  newData => {
    if (newData) {
      nodes.value = newData;
      // Preserve or reset selection/expansion if needed?
      // For now, let's keep expansion state as is, but validate if IDs still exist?
      // Simple approach: just update data. virtualization and computed will handle the rest.
    }
  },
  { deep: true }
);

// Public methods
const expandAll = () => {
  const allFolderIds = Object.values(nodes.value)
    .filter(node => node.type === 'folder')
    .map(node => node.id);
  expandedIds.value = new Set(allFolderIds);
};

const collapseAll = () => {
  expandedIds.value = new Set();
};

const focusItem = (nodeId: string) => {
  // Check if node exists
  const node = nodes.value[nodeId];
  if (!node) {
    console.warn(`Node ${nodeId} not found`);
    return;
  }

  // Expand all parent folders to make the item visible
  const parentsToExpand: string[] = [];
  let currentNode = node;

  while (currentNode.parentId !== null) {
    const parent = nodes.value[currentNode.parentId];
    if (parent && parent.type === 'folder') {
      parentsToExpand.push(parent.id);
    }
    currentNode = parent;
    if (!currentNode) break;
  }

  // Add all parents to expanded set
  if (parentsToExpand.length > 0) {
    parentsToExpand.forEach(id => expandedIds.value.add(id));
    expandedIds.value = new Set(expandedIds.value);
  }

  // Wait for next tick to ensure DOM is updated with newly visible items
  setTimeout(() => {
    const index = visibleNodeIds.value.indexOf(nodeId);
    if (index === -1) {
      console.warn(`Node ${nodeId} still not visible after expanding parents`);
      return;
    }

    focusedId.value = nodeId;
    selectedIds.value = new Set([nodeId]);
    emit('select', [nodeId]);
    scrollToItem(nodeId);
  }, props.delayFocus);
};

const clearSelection = () => {
  focusedId.value = null;
  selectedIds.value = new Set();
  emit('select', []);
};

defineExpose({
  expandAll,
  collapseAll,
  focusItem,
  clearSelection,
  startEditing,
  isMouseInside,
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
          ]"
          :node="nodes[visibleNodeIds[item.index]]"
          :is-selected="selectedIds.has(visibleNodeIds[item.index])"
          :is-expanded="expandedIds.has(visibleNodeIds[item.index])"
          :is-focused="focusedId === visibleNodeIds[item.index]"
          :is-editing="editingId === visibleNodeIds[item.index]"
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
          @cancel-rename="handleCancelRename"
        >
          <!-- Pass through action slot -->
          <template #actions="{ node }">
            <slot name="actions" :node="node" />
          </template>
        </TreeRow>
      </div>

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
</style>
