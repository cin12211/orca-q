<script setup lang="ts">
import Fuse from 'fuse.js';
import type { AcceptableValue } from 'reka-ui';
import { extendedFields } from '~/core/constants';

const props = defineProps<{ columns: string[]; value: string }>();

const emit = defineEmits<{
  (e: 'update:value', value: AcceptableValue): void;
  (e: 'update:open', value: boolean): void;
}>();

const searchTerm = ref('');

const normalizedSearchTerm = computed(() =>
  searchTerm.value.trim().toLowerCase()
);

const columnFuse = computed(
  () =>
    new Fuse(props.columns, {
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 1,
    })
);

const extendedFieldFuse = computed(
  () =>
    new Fuse(extendedFields, {
      keys: ['label', 'value'],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 1,
    })
);

const filteredColumns = computed(() => {
  const term = normalizedSearchTerm.value;

  if (!term) {
    return props.columns;
  }

  return columnFuse.value.search(term).map(result => result.item);
});

const filteredExtendedFields = computed(() => {
  const term = normalizedSearchTerm.value;

  if (!term) {
    return extendedFields;
  }

  return extendedFieldFuse.value.search(term).map(result => result.item);
});

const onOpenChange = (isOpen: boolean) => {
  emit('update:open', isOpen);

  if (!isOpen) {
    searchTerm.value = '';
  }
};
</script>

<template>
  <Select
    :model-value="value"
    @update:model-value="newValue => emit('update:value', newValue)"
    @update:open="onOpenChange"
  >
    <SelectTrigger class="w-36 min-w-36 h-6! text-sm cursor-pointer px-2">
      <SelectValue placeholder="Select field" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <div class="sticky top-0 z-10 bg-popover">
          <div class="p-1">
            <Input
              v-model:model-value="searchTerm"
              type="text"
              placeholder="Search fields"
              class="h-7 text-sm"
              autocomplete="off"
              @click.stop
              @mousedown.stop
              @keydown.stop
            />
          </div>

          <SelectSeparator />
        </div>

        <template v-if="filteredColumns.length">
          <SelectItem
            v-for="column in filteredColumns"
            :key="column"
            class="h-6 text-sm cursor-pointer"
            :value="column"
          >
            {{ column }}
          </SelectItem>
        </template>

        <SelectSeparator
          v-if="filteredColumns.length && filteredExtendedFields.length"
        />

        <template v-if="filteredExtendedFields.length">
          <SelectItem
            v-for="field in filteredExtendedFields"
            :key="field.value"
            class="h-6 text-sm cursor-pointer"
            :value="field.value"
          >
            {{ field.label }}
          </SelectItem>
        </template>

        <div
          v-if="!filteredColumns.length && !filteredExtendedFields.length"
          class="px-2 py-1 text-sm text-muted-foreground"
        >
          No fields found
        </div>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
