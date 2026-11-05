import { ref, type ComputedRef, type Ref } from 'vue';
import type { FileNode } from '../types';

interface UseTreeSelectionEmit {
  (event: 'select', nodeIds: string[]): void;
  (event: 'click', nodeId: string, mouseEvent: MouseEvent): void;
  (event: 'contextmenu', nodeId: string, mouseEvent: MouseEvent): void;
}

interface UseTreeSelectionDeps {
  nodes: Ref<Record<string, FileNode>>;
  visibleNodeIds: ComputedRef<string[]>;
  toggleExpansion: (nodeId: string) => void;
}

/**
 * Owns single/multi/range selection and keyboard focus, plus the row
 * click/dblclick/contextmenu/background-click handlers that drive it.
 */
export function useTreeSelection(
  emit: UseTreeSelectionEmit,
  { nodes, visibleNodeIds, toggleExpansion }: UseTreeSelectionDeps
) {
  const selectedIds = ref<Set<string>>(new Set());
  const focusedId = ref<string | null>(null);

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

  const handleContextMenu = (event: MouseEvent, nodeId: string) => {
    handleRowClick(event, nodeId);
    emit('contextmenu', nodeId, event);
  };

  const clearSelection = () => {
    focusedId.value = null;
    selectedIds.value = new Set();
    emit('select', []);
  };

  const handleBackgroundClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    // If the click originated from a tree row or its children, ignore it
    if (target.closest('.tree-row')) {
      return;
    }
    clearSelection();
  };

  return {
    selectedIds,
    focusedId,
    handleRowClick,
    handleRowDblClick,
    handleContextMenu,
    handleBackgroundClick,
    clearSelection,
  };
}
