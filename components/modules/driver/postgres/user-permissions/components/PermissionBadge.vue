<script setup lang="ts">
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: boolean | string;
  type?: 'boolean' | 'text';
}

const props = withDefaults(defineProps<Props>(), {
  type: 'boolean',
});

const isBoolean = computed(() => props.type === 'boolean');
const boolValue = computed(() => props.value === true);
</script>

<template>
  <Badge
    v-if="isBoolean"
    variant="outline"
    :class="['text-xs items-center flex gap-1 ', !boolValue && 'opacity-50']"
  >
    <Icon
      :name="boolValue ? 'lucide:check' : 'lucide:x'"
      :class="cn('size-3', boolValue && 'text-green-500')"
    />
    {{ label }}
  </Badge>
  <Badge v-else variant="secondary" class="text-xs">
    {{ label }}: {{ value }}
  </Badge>
</template>
