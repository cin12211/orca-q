<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui';
import { extendedFields } from '~/core/constants';

defineProps<{ columns: string[]; value: string }>();

defineEmits<{
  (e: 'update:value', value: AcceptableValue): void;
  (e: 'update:open', value: boolean): void;
}>();
</script>

<template>
  <Select
    :model-value="value"
    @update:model-value="$emit('update:value', $event)"
    @update:open="$emit('update:open', $event)"
  >
    <SelectTrigger class="w-36 min-w-36 h-6! text-sm cursor-pointer px-2">
      <SelectValue placeholder="Select field" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <!-- <SelectLabel>Fruits</SelectLabel> -->

        <SelectItem
          v-for="column in columns"
          class="h-6 text-sm cursor-pointer"
          :value="column"
        >
          {{ column }}
        </SelectItem>

        <SelectSeparator />

        <SelectItem
          v-for="field in extendedFields"
          class="h-6 text-sm cursor-pointer"
          :value="field.value"
        >
          {{ field.label }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
