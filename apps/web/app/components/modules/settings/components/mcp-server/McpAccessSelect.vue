<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

defineProps<{
  modelValue: string;
  options: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <Select
    size="xs"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', String($event))"
  >
    <SelectTrigger class="min-w-36 cursor-pointer">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
