import { ref, computed, h, render, type ComputedRef, type Ref } from 'vue';
import PseudomorphismDragItem from '../PseudomorphismDragItem.vue';
import type { DragData, DropIndicator, FileNode } from '../types';

interface UseTreeDragDropProps {
  allowDragAndDrop: boolean;
  allowSort: boolean;
  itemHeight: number;
  autoScrollThreshold: number;
  autoScrollSpeed: number;
  autoExpandDelay: number;
}

interface UseTreeDragDropEmit {
  (
    event: 'move',
    nodeId: string | string[],
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ): void;
}

interface UseTreeDragDropDeps {
  nodes: Ref<Record<string, FileNode>>;
  expandedIds: Ref<Set<string>>;
  visibleNodeIds: ComputedRef<string[]>;
  selectedIds: Ref<Set<string>>;
  parentRef: Ref<HTMLElement | null>;
}

/**
 * Owns drag-and-drop end to end: drag preview, auto-scroll near edges,
 * auto-expand-on-hover, drop position calculation, and the drop overlay
 * shown over the target folder + its visible descendants.
 */
export function useTreeDragDrop(
  props: UseTreeDragDropProps,
  emit: UseTreeDragDropEmit,
  {
    nodes,
    expandedIds,
    visibleNodeIds,
    selectedIds,
    parentRef,
  }: UseTreeDragDropDeps
) {
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

  // Create custom drag preview element using Vue's h() render function
  const createDragPreview = (
    count: number,
    itemName: string,
    itemType: 'file' | 'folder'
  ): HTMLElement => {
    const container = document.createElement('div');

    const vnode = h(PseudomorphismDragItem, {
      count,
      itemName,
      itemType,
    });

    render(vnode, container);

    return container.firstElementChild as HTMLElement;
  };

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

  // Auto-scroll when dragging near edges
  const handleAutoScroll = (event: DragEvent) => {
    if (!parentRef.value || !isDragging.value) return;

    const container = parentRef.value;
    const rect = container.getBoundingClientRect();
    const scrollThreshold = props.autoScrollThreshold;
    const scrollSpeed = props.autoScrollSpeed;

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
    const effectivePosition: 'before' | 'after' | 'inside' =
      overlayFolderId.value
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

  return {
    draggedId,
    dropIndicator,
    isDragging,
    overlayFolderId,
    overlayPosition,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
  };
}
