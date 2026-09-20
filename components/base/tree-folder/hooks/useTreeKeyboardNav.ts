import type { ComputedRef, Ref } from 'vue';
import type { FileNode } from '../types';

interface UseTreeKeyboardNavEmit {
  (event: 'click', nodeId: string, mouseEvent: MouseEvent): void;
  (event: 'delete', nodeId: string, keyboardEvent: KeyboardEvent): void;
}

interface UseTreeKeyboardNavDeps {
  nodes: Ref<Record<string, FileNode>>;
  expandedIds: Ref<Set<string>>;
  visibleNodeIds: ComputedRef<string[]>;
  focusedId: Ref<string | null>;
  toggleExpansion: (nodeId: string) => void;
  scrollToItem: (nodeId: string) => void;
}

/**
 * Owns arrow-key/Enter/Delete navigation over the flattened, visible node
 * list, moving focus and expanding/collapsing folders as needed.
 */
export function useTreeKeyboardNav(
  emit: UseTreeKeyboardNavEmit,
  {
    nodes,
    expandedIds,
    visibleNodeIds,
    focusedId,
    toggleExpansion,
    scrollToItem,
  }: UseTreeKeyboardNavDeps
) {
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
      case ' ': {
        event.preventDefault();
        const node = nodes.value[focusedId.value];
        if (node.type === 'folder') {
          toggleExpansion(focusedId.value);
        } else {
          emit('click', focusedId.value, event as unknown as MouseEvent);
        }
        break;
      }

      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        emit('delete', focusedId.value, event);
        break;
    }

    if (newIdx !== currentIdx) {
      focusedId.value = visibleNodeIds.value[newIdx];
      // Scroll focused item into view
      scrollToItem(focusedId.value);
    }
  };

  return {
    handleKeyDown,
  };
}
