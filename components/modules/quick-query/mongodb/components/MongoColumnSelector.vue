<script setup lang="ts">
import { computed } from 'vue';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

const props = defineProps<{
  columns: string[];
  value?: string;
}>();

const emit = defineEmits<{
  (e: 'update:value', value: string): void;
  (e: 'update:open', open: boolean): void;
}>();

const selectedColumn = computed({
  get: () => props.value || props.columns[0] || '_id',
  set: val => {
    if (val) emit('update:value', val);
  },
});
</script>

<template>
  <Select
    size="xxs"
    v-model="selectedColumn"
    @update:open="isOpen => emit('update:open', isOpen)"
  >
    <SelectTrigger class="w-36 min-w-36 cursor-pointer">
      <SelectValue placeholder="Select field" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem
          v-for="col in props.columns"
          :key="col"
          :value="col"
          class="cursor-pointer"
        >
          {{ col }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
