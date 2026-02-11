<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue';
import { Icon } from '#components';
import { ChevronRight, Folder, FolderOpen, File } from 'lucide-vue-next';
import type { FileNode, DropPosition } from './types';

interface Props {
  node: FileNode;
  isSelected: boolean;
  isExpanded: boolean;
  isFocused: boolean;
  dropIndicator?: { position: DropPosition } | null;
  isEditing?: boolean;
  allowDragAndDrop?: boolean;
  itemHeight?: number;
  indentSize?: number;
  baseIndent?: number;
}

const props = withDefaults(defineProps<Props>(), {
  isEditing: false,
  allowDragAndDrop: true,
  itemHeight: 24,
  indentSize: 20,
  baseIndent: 8,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
  dblclick: [event: MouseEvent];
  toggle: [];
  dragstart: [event: DragEvent];
  dragover: [event: DragEvent];
  dragleave: [event: DragEvent];
  dragend: [event: DragEvent];
  drop: [event: DragEvent];
  contextmenu: [event: MouseEvent];
  rename: [newName: string];
  cancelRename: [];
}>();

// Local editing state
const editingName = ref(props.node.name);
const inputRef = ref<HTMLInputElement | null>(null);

// Handle rename submission
const handleRenameSubmit = () => {
  const trimmedName = editingName.value.trim();
  if (trimmedName && trimmedName !== props.node.name) {
    emit('rename', trimmedName);
  } else {
    emit('cancelRename');
  }
};

// Handle rename cancel
const handleRenameCancel = () => {
  editingName.value = props.node.name;
  emit('cancelRename');
};

// Focus input when editing starts
const focusInput = async () => {
  await nextTick();
  inputRef.value?.focus();
  inputRef.value?.select();
};

// Watch for editing mode changes and node name changes
watch(
  () => props.isEditing,
  newVal => {
    if (newVal) {
      editingName.value = props.node.name;
      focusInput();
    }
  }
);

watch(
  () => props.node.name,
  newVal => {
    if (!props.isEditing) {
      editingName.value = newVal;
    }
  }
);

// Calculate indentation and height based on props
const rowStyle = computed(() => ({
  paddingLeft: `${props.node.depth * props.indentSize + props.baseIndent}px`,
  height: `${props.itemHeight}px`,
}));

// Determine which icon to show
const customIcon = computed(() => {
  if (props.node.type === 'folder') {
    return props.isExpanded
      ? props.node.iconOpen || props.node.iconClose
      : props.node.iconClose;
  }
  return props.node.iconClose;
});

const defaultIcon = computed(() => {
  if (props.node.type === 'folder') {
    return props.isExpanded ? FolderOpen : Folder;
  }
  return File;
});

// Row classes
const rowClasses = computed(() => ({
  'tree-row': true,
  'tree-row--selected': props.isSelected,
  'tree-row--focused': props.isFocused,
  'tree-row--drop-before': props.dropIndicator?.position === 'before',
  'tree-row--drop-after': props.dropIndicator?.position === 'after',
  'tree-row--drop-inside': props.dropIndicator?.position === 'inside',
}));

// Chevron rotation
const chevronRotation = computed(() => ({
  transform: props.isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
}));

// Expose focusInput for parent component
defineExpose({
  focusInput,
});
</script>

<template>
  <div
    :class="rowClasses"
    :style="rowStyle"
    :draggable="allowDragAndDrop && !isEditing"
    @click="emit('click', $event)"
    @dblclick="emit('dblclick', $event)"
    @dragstart="emit('dragstart', $event)"
    @dragover="emit('dragover', $event)"
    @dragleave="emit('dragleave', $event)"
    @dragend="emit('dragend', $event)"
    @drop="emit('drop', $event)"
    @click.right="emit('contextmenu', $event)"
  >
    <!-- Chevron (only for folders) -->
    <button
      v-if="node.type === 'folder'"
      class="tree-row__chevron"
      :style="chevronRotation"
      @click.stop="emit('toggle')"
    >
      <ChevronRight :size="16" />
    </button>
    <div v-else class="tree-row__spacer" />

    <!-- Icon -->
    <Icon
      v-if="customIcon"
      :name="customIcon"
      class="tree-row__icon size-4!"
      :class="node.iconClass"
    />
    <component
      v-else
      :is="defaultIcon"
      :size="16"
      class="tree-row__icon"
      :class="node.iconClass"
    />

    <!-- Name or Edit Input -->
    <span v-if="!isEditing" class="tree-row__name">{{ node.name }}</span>
    <input
      v-else
      ref="inputRef"
      v-model="editingName"
      type="text"
      class="tree-row__edit-input"
      @blur="handleRenameSubmit"
      @keydown.enter.stop="handleRenameSubmit"
      @keydown.esc="handleRenameCancel"
      @click.stop
      @dblclick.stop
    />

    <!-- Action Slot -->
    <div v-if="!isEditing" class="tree-row__actions" @click.stop>
      <slot name="actions" :node="node" />
    </div>
  </div>
</template>

<style scoped>
/* 
 * Tree Row Component Styles
 * Uses CSS variables from your design system for easy theming
 * Customize by overriding these CSS variables:
 * - --tree-row-hover-bg
 * - --tree-row-selected-bg
 * - --tree-row-focus-ring
 * - --tree-indicator-color
 */

.tree-row {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: var(--v-tree-row-transition, background-color 0.1s ease);
  border-radius: var(--radius-sm, 4px);
  margin: var(--v-tree-row-margin, 0 4px);
  /* Performance: Use CSS containment */
  contain: layout style paint;
}

.tree-row:hover {
  background-color: var(--v-tree-row-hover-bg, hsl(var(--accent)));
}

.tree-row--selected {
  background-color: var(--v-tree-row-selected-bg, hsl(var(--primary) / 0.15));
}

.tree-row--selected:hover {
  background-color: var(
    --v-tree-row-selected-hover-bg,
    hsl(var(--primary) / 0.2)
  );
}

.tree-row--focused {
  outline: var(--v-tree-row-focus-ring-width, 1px) solid
    var(--v-tree-row-focus-ring, hsl(var(--ring)));
  outline-offset: var(--v-tree-row-focus-ring-offset, -1px);
}

/* Drop indicators - Optimized for performance */
.tree-row--drop-before::before,
.tree-row--drop-after::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: var(--v-tree-indicator-height, 2px);
  background-color: var(--v-tree-indicator-color, hsl(var(--primary)));
  z-index: 10;
  /* Performance: Hint browser about animation */
  will-change: transform;
  pointer-events: none;
}

.tree-row--drop-before::before {
  top: -1px;
}

.tree-row--drop-after::after {
  bottom: -1px;
}

.tree-row--drop-inside {
  background-color: var(--v-tree-drop-inside-bg, hsl(var(--primary) / 0.1));
  /* Performance: Use box-shadow instead of outline for compositing */
  box-shadow: inset 0 0 0 var(--v-tree-drop-inside-border-width, 1px)
    var(--v-tree-indicator-color, hsl(var(--primary)));
  /* Performance: Hint browser */
  will-change: background-color;
}

.tree-row__chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--v-tree-chevron-size, 20px);
  height: var(--v-tree-chevron-size, 20px);
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: var(--v-tree-chevron-transition, transform 0.15s ease);
  flex-shrink: 0;
  color: currentColor;
}

.tree-row__chevron:hover {
  background-color: var(--v-tree-chevron-hover-bg, hsl(var(--accent)));
  border-radius: var(--radius-sm, 3px);
}

.tree-row__spacer {
  width: var(--v-tree-chevron-size, 20px);
  flex-shrink: 0;
}

.tree-row__icon {
  margin-right: var(--v-tree-icon-spacing, 6px);
  flex-shrink: 0;
  /* color: var(--v-tree-icon-color, currentColor); */
}

.tree-row__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--v-tree-row-font-size, 13px);
  color: var(--v-tree-row-text-color, currentColor);
}

.tree-row__edit-input {
  flex: 1;
  padding: var(--v-tree-input-padding, 2px 6px);
  font-size: var(--v-tree-input-font-size, 13px);
  background-color: var(--v-tree-input-bg, hsl(var(--input)));
  border: var(--v-tree-input-border-width, 1px) solid
    var(--v-tree-input-border, hsl(var(--border)));
  border-radius: var(--radius-sm, 3px);
  color: var(--v-tree-input-text-color, hsl(var(--foreground)));
  outline: none;
}

.tree-row__edit-input:focus {
  background-color: var(--v-tree-input-focus-bg, hsl(var(--accent)));
  border-color: var(--v-tree-input-focus-border, hsl(var(--ring)));
}

.tree-row__actions {
  display: flex;
  align-items: center;
  gap: var(--v-tree-actions-gap, 4px);
  margin-left: var(--v-tree-actions-spacing, 8px);
  opacity: var(--v-tree-actions-opacity-hidden, 0);
  /* Performance: No transition during drag operations */
  transition: var(--v-tree-actions-transition, opacity 0.1s ease);
  /* Performance: Hint browser about changes */
  will-change: opacity;
}

.tree-row:hover .tree-row__actions {
  opacity: var(--v-tree-actions-opacity-visible, 1);
}
</style>
