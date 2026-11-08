import { ref, computed, type ComputedRef, type Ref } from 'vue';
import type { FileNode } from '../types';

interface UseTreeRenameProps {
  validateRename?: (nodeId: string, newName: string) => string | true;
  itemHeight: number;
  indentSize: number;
  baseIndent: number;
}

interface UseTreeRenameEmit {
  (event: 'rename', nodeId: string, newName: string): void;
  (event: 'cancel-rename', nodeId: string): void;
}

interface UseTreeRenameDeps {
  nodes: Ref<Record<string, FileNode>>;
  visibleNodeIds: ComputedRef<string[]>;
}

/**
 * Owns inline-rename editing state, per-node validation errors, and the
 * error tooltip's position relative to the editing row.
 */
export function useTreeRename(
  props: UseTreeRenameProps,
  emit: UseTreeRenameEmit,
  { nodes, visibleNodeIds }: UseTreeRenameDeps
) {
  const editingId = ref<string | null>(null);
  const renameErrors = ref<Record<string, string>>({});

  // Error tooltip position — computed from the editing node's index (like overlayPosition)
  const errorTooltipPosition = computed(() => {
    if (!editingId.value) return null;

    const errorMessage = renameErrors.value[editingId.value];
    if (!errorMessage) return null;

    const nodeIndex = visibleNodeIds.value.indexOf(editingId.value);
    if (nodeIndex === -1) return null;

    const node = nodes.value[editingId.value];
    if (!node) return null;

    // Position directly below the editing row
    const top = (nodeIndex + 1) * props.itemHeight + 2; // 4px gap from the row
    // Align left with the node's text area (depth indent + base + chevron + icon)
    const left = node.depth * props.indentSize + props.baseIndent + 20 + 22;

    return {
      top,
      left,
      message: errorMessage,
    };
  });

  const handleRename = (nodeId: string, newName: string) => {
    if (props.validateRename) {
      const result = props.validateRename(nodeId, newName);
      if (result !== true) {
        renameErrors.value = {
          ...renameErrors.value,
          [nodeId]: result,
        };
        editingId.value = nodeId;
        return;
      }
    }

    if (renameErrors.value[nodeId]) {
      const nextErrors = { ...renameErrors.value };
      delete nextErrors[nodeId];
      renameErrors.value = nextErrors;
    }

    editingId.value = null;
    emit('rename', nodeId, newName);
  };

  const handleCancelRename = (nodeId: string) => {
    if (renameErrors.value[nodeId]) {
      const nextErrors = { ...renameErrors.value };
      delete nextErrors[nodeId];
      renameErrors.value = nextErrors;
    }

    editingId.value = null;
    emit('cancel-rename', nodeId);
  };

  const handleEditingChange = (nodeId: string, newName: string) => {
    if (!props.validateRename) return;

    const result = props.validateRename(nodeId, newName);
    const hasError = !!renameErrors.value[nodeId];

    if (result !== true) {
      renameErrors.value = {
        ...renameErrors.value,
        [nodeId]: result,
      };
      return;
    }

    if (result === true && hasError) {
      const nextErrors = { ...renameErrors.value };
      delete nextErrors[nodeId];
      renameErrors.value = nextErrors;
    }
  };

  // Public method to start editing
  const startEditing = (nodeId: string) => {
    if (renameErrors.value[nodeId]) {
      const nextErrors = { ...renameErrors.value };
      delete nextErrors[nodeId];
      renameErrors.value = nextErrors;
    }

    editingId.value = nodeId;
  };

  return {
    editingId,
    renameErrors,
    errorTooltipPosition,
    handleRename,
    handleCancelRename,
    handleEditingChange,
    startEditing,
  };
}
