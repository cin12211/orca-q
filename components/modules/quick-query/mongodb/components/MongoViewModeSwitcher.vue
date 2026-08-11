<script setup lang="ts">
import type { MongoCollectionViewMode } from '../types';

defineProps<{ modelValue: MongoCollectionViewMode }>();
const emit = defineEmits<{ 'update:modelValue': [MongoCollectionViewMode] }>();

const MODES: { value: MongoCollectionViewMode; label: string }[] = [
  { value: 'table', label: 'Table' },
  { value: 'list', label: 'List' },
  { value: 'object-list', label: 'Object List' },
];
</script>

<template>
  <div class="flex items-center gap-1 rounded-md border p-0.5">
    <button
      v-for="mode in MODES"
      :key="mode.value"
      type="button"
      :data-testid="`mongo-view-mode-${mode.value}`"
      :aria-pressed="modelValue === mode.value"
      class="px-2.5 py-1 text-sm rounded-sm transition-colors"
      :class="
        modelValue === mode.value
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted'
      "
      @click="emit('update:modelValue', mode.value)"
    >
      {{ mode.label }}
    </button>
  </div>
</template>
