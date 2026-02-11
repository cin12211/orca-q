<script setup lang="ts">
import { computed } from 'vue';
import { Folder, File, Package } from 'lucide-vue-next';

interface Props {
  count: number;
  itemName: string;
  itemType: 'file' | 'folder';
}

const props = defineProps<Props>();

// Determine icon component
const IconComponent = computed(() => {
  if (props.count > 1) {
    return Package;
  }

  return props.itemType === 'folder' ? Folder : File;
});

// Display text
const displayText = computed(() => {
  return props.count === 1 ? props.itemName : `${props.count} items`;
});

// Show badge only for multi-select
const showBadge = computed(() => props.count > 1);
</script>

<template>
  <div class="drag-preview">
    <!-- Icon -->
    <span class="drag-preview__icon">
      <component :is="IconComponent" :size="16" :stroke-width="2" />
    </span>

    <!-- Text -->
    <span class="drag-preview__text">
      {{ displayText }}
    </span>

    <!-- Badge (only for multi-select) -->
    <span v-if="showBadge" class="drag-preview__badge">
      {{ count }}
    </span>
  </div>
</template>

<style scoped>
/* 
 * Drag Preview Component Styles
 * Uses CSS variables from your design system for easy theming
 * Customize by overriding these CSS variables:
 * - --drag-preview-bg
 * - --drag-preview-text
 * - --drag-preview-badge-bg
 */

.drag-preview {
  /* Position */
  position: absolute;
  top: -9999px;
  left: -9999px;
  z-index: 10000;
  pointer-events: none;

  /* Layout */
  display: flex;
  align-items: center;
  gap: var(--v-tree-drag-preview-gap, 0.5rem);
  min-width: var(--v-tree-drag-preview-min-width, 120px);
  max-width: var(--v-tree-drag-preview-max-width, 300px);
  padding: var(--v-tree-drag-preview-padding, 0.5rem 1rem);

  /* Appearance */
  background: var(
    --v-tree-drag-preview-bg,
    linear-gradient(
      to bottom right,
      hsl(var(--primary) / 0.95),
      hsl(var(--primary) / 0.98)
    )
  );
  color: var(--v-tree-drag-preview-text, hsl(var(--primary-foreground)));
  border-radius: var(
    --v-tree-drag-preview-border-radius,
    var(--radius-lg, 0.5rem)
  );
  font-size: var(--v-tree-drag-preview-font-size, 13px);
  font-weight: var(--v-tree-drag-preview-font-weight, 600);

  /* Effects */
  box-shadow: var(
    --v-tree-drag-preview-shadow,
    0 10px 30px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1)
  );
  backdrop-filter: var(--v-tree-drag-preview-backdrop-filter, blur(10px));
}

.drag-preview__icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--v-tree-drag-preview-icon-color, currentColor);
}

.drag-preview__text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--v-tree-drag-preview-text-font-size, inherit);
}

.drag-preview__badge {
  margin-left: auto;
  flex-shrink: 0;
  padding: var(--v-tree-drag-preview-badge-padding, 0.125rem 0.5rem);
  background: var(--v-tree-drag-preview-badge-bg, rgba(255, 255, 255, 0.25));
  border-radius: var(--v-tree-drag-preview-badge-radius, 0.75rem);
  font-size: var(--v-tree-drag-preview-badge-font-size, 11px);
  font-weight: var(--v-tree-drag-preview-badge-font-weight, 700);
}
</style>
