import type { ComputedRef, Ref } from 'vue';
import type { FileNode } from '../types';

interface UseTreeFocusItemProps {
  delayFocus: number;
}

interface UseTreeFocusItemEmit {
  (event: 'select', nodeIds: string[]): void;
}

interface UseTreeFocusItemDeps {
  nodes: Ref<Record<string, FileNode>>;
  expandedIds: Ref<Set<string>>;
  visibleNodeIds: ComputedRef<string[]>;
  focusedId: Ref<string | null>;
  selectedIds: Ref<Set<string>>;
  scrollToItem: (nodeId: string) => void;
}

/**
 * Owns the public `focusItem` API: expands all ancestor folders of a node
 * so it becomes visible, then selects, focuses, and scrolls to it.
 */
export function useTreeFocusItem(
  props: UseTreeFocusItemProps,
  emit: UseTreeFocusItemEmit,
  {
    nodes,
    expandedIds,
    visibleNodeIds,
    focusedId,
    selectedIds,
    scrollToItem,
  }: UseTreeFocusItemDeps
) {
  const focusItem = (nodeId: string) => {
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
        console.warn(
          `Node ${nodeId} still not visible after expanding parents`
        );
        return;
      }

      focusedId.value = nodeId;
      selectedIds.value = new Set([nodeId]);
      emit('select', [nodeId]);
      scrollToItem(nodeId);
    }, props.delayFocus);
  };

  return {
    focusItem,
  };
}
